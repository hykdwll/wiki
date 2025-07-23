const express = require('express');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3001; // 使用3001端口避免与Docsify的3000端口冲突

// 配置静态文件服务
app.use(express.static(path.join(__dirname)));
app.use(bodyParser.json());

// 配置multer存储
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 从请求体中获取目标目录
    const targetDir = req.body.targetDirectory || '';
    const fullPath = path.join(__dirname, targetDir);
    
    // 确保目录存在
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
    }
    
    cb(null, fullPath);
  },
  filename: function (req, file, cb) {
    // 使用提供的文件名或原始文件名
    const fileName = req.body.fileName || file.originalname;
    cb(null, fileName);
  }
});

const upload = multer({ storage: storage });

// 获取目录结构
app.get('/api/directories', (req, res) => {
  console.log('收到获取目录结构请求');
  try {
    const rootDir = __dirname;
    const ignoreDirs = ['.git', 'node_modules'];
    
    function getDirectories(dir, baseDir = '') {
      console.log(`正在扫描目录: ${dir}`);
      try {
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        const dirs = entries
          .filter(entry => entry.isDirectory() && !ignoreDirs.includes(entry.name))
          .map(entry => {
            const fullPath = path.join(dir, entry.name);
            const relativePath = path.join(baseDir, entry.name);
            
            try {
              return {
                name: entry.name,
                path: relativePath,
                children: getDirectories(fullPath, relativePath)
              };
            } catch (subError) {
              console.error(`处理子目录 ${fullPath} 时出错:`, subError);
              return {
                name: entry.name,
                path: relativePath,
                children: [],
                error: subError.message
              };
            }
          });
        
        return dirs;
      } catch (dirError) {
        console.error(`读取目录 ${dir} 时出错:`, dirError);
        return [];
      }
    }
    
    const directories = getDirectories(rootDir);
    console.log('成功生成目录结构');
    
    // 设置CORS头部以允许跨域请求
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Access-Control-Allow-Headers', 'Content-Type');
    
    res.json(directories);
  } catch (error) {
    console.error('获取目录结构失败:', error);
    res.status(500).json({ error: true, message: '获取目录结构失败: ' + error.message });
  }
});

// 获取目录下的文件
app.get('/api/files', (req, res) => {
  try {
    const dirPath = req.query.path || '';
    const fullPath = path.join(__dirname, dirPath);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: '目录不存在' });
    }
    
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });
    const files = entries
      .filter(entry => entry.isFile() && entry.name.endsWith('.md'))
      .map(entry => ({
        name: entry.name,
        path: path.join(dirPath, entry.name)
      }));
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('获取文件列表失败:', error);
    res.status(500).json({ success: false, message: '获取文件列表失败: ' + error.message });
  }
});

// 上传文件接口
app.post('/api/upload', upload.single('file'), (req, res) => {
  try {
    // 文件已通过multer中间件上传
    const { targetDirectory, fileName, customName } = req.body;
    const uploadedFile = req.file;
    
    if (!uploadedFile) {
      return res.status(400).json({ success: false, message: '未找到上传的文件' });
    }
    
    // 使用自定义名称或原文件名
    const finalFileName = customName ? `${customName}.md` : uploadedFile.filename;
    
    // 如果使用自定义名称，需要重命名文件
    if (customName && finalFileName !== uploadedFile.filename) {
      const oldPath = path.join(uploadedFile.destination, uploadedFile.filename);
      const newPath = path.join(uploadedFile.destination, finalFileName);
      fs.renameSync(oldPath, newPath);
    }
    
    // 更新侧边栏文件
    updateSidebar(targetDirectory, finalFileName);
    
    res.json({ 
      success: true, 
      message: '文件上传成功',
      path: path.join(targetDirectory, finalFileName)
    });
  } catch (error) {
    console.error('上传失败:', error);
    res.status(500).json({ success: false, message: '上传失败: ' + error.message });
  }
});

// 创建新目录
app.post('/api/directory', (req, res) => {
  try {
    const { path: dirPath, name } = req.body;
    const fullPath = path.join(__dirname, dirPath, name);
    
    if (!fs.existsSync(fullPath)) {
      fs.mkdirSync(fullPath, { recursive: true });
      
      // 在新目录中创建 README.md
      const readmePath = path.join(fullPath, 'README.md');
      fs.writeFileSync(readmePath, `# ${name}\n\n这是${name}分类的文档集合。`);
      
      // 更新侧边栏
      updateSidebarWithNewDirectory(dirPath, name);
      
      res.json({ success: true, message: '目录创建成功' });
    } else {
      res.status(400).json({ success: false, message: '目录已存在' });
    }
  } catch (error) {
    console.error('创建目录失败:', error);
    res.status(500).json({ success: false, message: '创建目录失败: ' + error.message });
  }
});

// 修改目录名称
app.put('/api/directory', (req, res) => {
  try {
    const { path: dirPath, oldName, newName } = req.body;
    
    if (!dirPath || !oldName || !newName) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    const oldPath = path.join(__dirname, dirPath, oldName);
    const newPath = path.join(__dirname, dirPath, newName);
    
    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ success: false, message: '源目录不存在' });
    }
    
    if (fs.existsSync(newPath)) {
      return res.status(400).json({ success: false, message: '目标目录已存在' });
    }
    
    // 重命名目录
    fs.moveSync(oldPath, newPath);
    
    // 更新侧边栏
    updateSidebarAfterDirectoryRename(dirPath, oldName, newName);
    
    res.json({ success: true, message: '目录重命名成功' });
  } catch (error) {
    console.error('重命名目录失败:', error);
    res.status(500).json({ success: false, message: '重命名目录失败: ' + error.message });
  }
});

// 修改文件名称
app.put('/api/file', (req, res) => {
  try {
    const { directory, oldName, newName } = req.body;
    
    if (!directory || !oldName || !newName) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    // 确保新文件名有.md扩展名
    const newNameWithExt = newName.endsWith('.md') ? newName : `${newName}.md`;
    const oldPath = path.join(__dirname, directory, oldName);
    const newPath = path.join(__dirname, directory, newNameWithExt);
    
    if (!fs.existsSync(oldPath)) {
      return res.status(404).json({ success: false, message: '源文件不存在' });
    }
    
    if (fs.existsSync(newPath)) {
      return res.status(400).json({ success: false, message: '目标文件已存在' });
    }
    
    // 重命名文件
    fs.renameSync(oldPath, newPath);
    
    // 更新侧边栏
    updateSidebarAfterFileRename(directory, oldName, newNameWithExt);
    
    res.json({ success: true, message: '文件重命名成功' });
  } catch (error) {
    console.error('重命名文件失败:', error);
    res.status(500).json({ success: false, message: '重命名文件失败: ' + error.message });
  }
});

// 删除目录
app.delete('/api/directory', (req, res) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    const fullPath = path.join(__dirname, path);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: '目录不存在' });
    }
    
    // 检查目录是否为空（只允许删除空目录或只包含README.md的目录）
    const files = fs.readdirSync(fullPath);
    const nonReadmeFiles = files.filter(file => file !== 'README.md');
    
    if (nonReadmeFiles.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: '目录不为空，请先删除目录中的内容' 
      });
    }
    
    // 删除目录及其内容
    fs.removeSync(fullPath);
    
    // 从侧边栏中移除
    updateSidebarAfterDirectoryDelete(path);
    
    res.json({ success: true, message: '目录删除成功' });
  } catch (error) {
    console.error('删除目录失败:', error);
    res.status(500).json({ success: false, message: '删除目录失败: ' + error.message });
  }
});

// 删除文件
app.delete('/api/file', (req, res) => {
  try {
    const { path } = req.body;
    
    if (!path) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    const fullPath = path.join(__dirname, path);
    
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: '文件不存在' });
    }
    
    // 不允许删除README.md文件（基本目录标识）
    if (path.endsWith('/README.md')) {
      return res.status(400).json({ 
        success: false, 
        message: '不能删除目录的README文件' 
      });
    }
    
    // 删除文件
    fs.unlinkSync(fullPath);
    
    // 从侧边栏中移除
    updateSidebarAfterFileDelete(path);
    
    res.json({ success: true, message: '文件删除成功' });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({ success: false, message: '删除文件失败: ' + error.message });
  }
});

// 获取侧边栏目录名称映射
app.get('/api/sidebar-mapping', (req, res) => {
  try {
    const sidebarPath = path.join(__dirname, '_sidebar.md');
    const sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    
    // 解析侧边栏文件，提取目录显示名称与路径的映射关系
    const directoryMapping = {};
    
    // 正则表达式匹配 Markdown 链接格式: [显示名称](路径)
    const linkRegex = /\*\s+\[(.*?)\]\((.*?)\)/g;
    let match;
    
    while ((match = linkRegex.exec(sidebarContent)) !== null) {
      const displayName = match[1];
      let filePath = match[2];
      
      // 如果路径指向 README.md 文件，则获取其所在目录
      if (filePath.endsWith('/README.md')) {
        filePath = filePath.substring(0, filePath.length - 'README.md'.length);
      }
      
      // 移除开头的 '/' 和结尾的 '/'
      filePath = filePath.replace(/^\/|\/$/g, '');
      
      // 只处理非根目录的映射
      if (filePath && filePath !== '/') {
        // 将路径作为键，显示名称作为值
        directoryMapping[filePath] = displayName;
      }
    }
    
    // 根据目录层级结构建立完整映射
    // 例如，如果有 tech/frontend/README.md，我们需要确保 tech/frontend 也有映射
    const fullMapping = { ...directoryMapping };
    
    Object.keys(directoryMapping).forEach(path => {
      const segments = path.split('/');
      let currentPath = '';
      
      for (let i = 0; i < segments.length; i++) {
        if (i > 0) {
          currentPath += '/';
        }
        currentPath += segments[i];
        
        // 如果还没有这个路径的映射，尝试使用父级路径的第一部分作为默认名称
        if (!fullMapping[currentPath] && currentPath) {
          // 使用当前段作为默认显示名称
          fullMapping[currentPath] = segments[i];
        }
      }
    });
    
    res.json(fullMapping);
  } catch (error) {
    console.error('获取侧边栏映射失败:', error);
    res.status(500).json({ success: false, message: '获取侧边栏映射失败: ' + error.message });
  }
});

// 修改目录的显示名称（只修改侧边栏中的显示，不修改文件系统）
app.put('/api/directory-display-name', (req, res) => {
  try {
    const { path, newDisplayName } = req.body;
    
    if (!path || !newDisplayName) {
      return res.status(400).json({ success: false, message: '参数不完整' });
    }
    
    // 检查目录是否存在
    const fullPath = path.join(__dirname, path);
    if (!fs.existsSync(fullPath)) {
      return res.status(404).json({ success: false, message: '目录不存在' });
    }
    
    // 更新侧边栏显示名称
    const success = updateDirectoryDisplayName(path, newDisplayName);
    
    if (success) {
      res.json({ success: true, message: '目录显示名称修改成功' });
    } else {
      res.status(500).json({ success: false, message: '目录显示名称修改失败，可能未在侧边栏找到该目录' });
    }
  } catch (error) {
    console.error('修改目录显示名称失败:', error);
    res.status(500).json({ success: false, message: '修改目录显示名称失败: ' + error.message });
  }
});

// 更新侧边栏中目录的显示名称
function updateDirectoryDisplayName(dirPath, newDisplayName) {
  const sidebarPath = path.join(__dirname, '_sidebar.md');
  try {
    let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    const lines = sidebarContent.split('\n');
    let found = false;
    
    // 构建目录路径的正则模式
    // 注意: 我们查找的是包含目录路径的链接，但要替换的是显示名称
    const pathPattern = new RegExp(`\\[(.*?)\\]\\(${dirPath}/README\\.md\\)`, 'i');
    
    for (let i = 0; i < lines.length; i++) {
      const match = lines[i].match(pathPattern);
      if (match) {
        // 替换显示名称，保持路径不变
        lines[i] = lines[i].replace(match[0], `[${newDisplayName}](${dirPath}/README.md)`);
        found = true;
      }
    }
    
    if (found) {
      fs.writeFileSync(sidebarPath, lines.join('\n'));
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('更新目录显示名称失败:', error);
    return false;
  }
}

// 更新侧边栏文件
function updateSidebar(targetDirectory, fileName) {
  // 仅处理.md文件且不是README.md
  if (!fileName.endsWith('.md') || fileName === 'README.md') return;
  
  const sidebarPath = path.join(__dirname, '_sidebar.md');
  try {
    let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    const fileNameWithoutExt = fileName.replace('.md', '');
    const relativePath = targetDirectory ? `${targetDirectory}/${fileName}` : fileName;
    
    // 将targetDirectory分解为层级目录
    const dirParts = targetDirectory.split('/').filter(Boolean);
    
    if (dirParts.length > 0) {
      // 查找目录对应的部分并添加文件
      const lines = sidebarContent.split('\n');
      let indentLevel = 0;
      let foundPos = -1;
      
      // 查找目录所在位置
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 计算缩进级别
        const match = line.match(/^(\s*)[*-]/);
        if (match) {
          const spaces = match[1].length;
          const currentIndent = spaces / 2; // 假设每级缩进是2个空格
          
          // 检查是否是当前层级的目录
          const titleMatch = line.match(/\[(.*?)\]/);
          if (titleMatch && titleMatch[1] === dirParts[dirParts.length - 1]) {
            indentLevel = currentIndent;
            foundPos = i;
            break;
          }
        }
      }
      
      if (foundPos !== -1) {
        // 找到目录位置，在合适的位置插入新条目
        const newEntry = `${'  '.repeat(indentLevel + 1)}* [${fileNameWithoutExt}](${relativePath})`;
        
        // 找到插入位置（在目录的子项之后）
        let insertPos = foundPos + 1;
        while (insertPos < lines.length) {
          const line = lines[insertPos];
          if (!line.trim()) {
            break;
          }
          
          const match = line.match(/^(\s*)[*-]/);
          if (match) {
            const spaces = match[1].length;
            const currentIndent = spaces / 2;
            
            if (currentIndent <= indentLevel) {
              break;
            }
          }
          insertPos++;
        }
        
        lines.splice(insertPos, 0, newEntry);
        fs.writeFileSync(sidebarPath, lines.join('\n'));
      } else {
        // 目录未找到，简单添加到最后
        sidebarContent += `\n* [${fileNameWithoutExt}](${relativePath})`;
        fs.writeFileSync(sidebarPath, sidebarContent);
      }
    } else {
      // 添加到根目录
      sidebarContent += `\n* [${fileNameWithoutExt}](${relativePath})`;
      fs.writeFileSync(sidebarPath, sidebarContent);
    }
  } catch (error) {
    console.error('更新侧边栏失败:', error);
  }
}

// 更新侧边栏添加新目录
function updateSidebarWithNewDirectory(parentDir, dirName) {
  const sidebarPath = path.join(__dirname, '_sidebar.md');
  try {
    let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    const relativePath = parentDir ? `${parentDir}/${dirName}/README.md` : `${dirName}/README.md`;
    const dirParts = parentDir.split('/').filter(Boolean);
    
    if (dirParts.length > 0) {
      // 查找目录对应的部分并添加子目录
      const lines = sidebarContent.split('\n');
      let indentLevel = 0;
      let foundPos = -1;
      
      // 查找父目录所在位置
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // 计算缩进级别
        const match = line.match(/^(\s*)[*-]/);
        if (match) {
          const spaces = match[1].length;
          const currentIndent = spaces / 2; // 假设每级缩进是2个空格
          
          // 检查是否是当前层级的目录
          const titleMatch = line.match(/\[(.*?)\]/);
          if (titleMatch && titleMatch[1] === dirParts[dirParts.length - 1]) {
            indentLevel = currentIndent;
            foundPos = i;
            break;
          }
        }
      }
      
      if (foundPos !== -1) {
        // 找到目录位置，在合适的位置插入新条目
        const newEntry = `${'  '.repeat(indentLevel + 1)}* [${dirName}](${relativePath})`;
        
        // 找到插入位置（在目录的子项之后）
        let insertPos = foundPos + 1;
        while (insertPos < lines.length) {
          const line = lines[insertPos];
          if (!line.trim()) {
            break;
          }
          
          const match = line.match(/^(\s*)[*-]/);
          if (match) {
            const spaces = match[1].length;
            const currentIndent = spaces / 2;
            
            if (currentIndent <= indentLevel) {
              break;
            }
          }
          insertPos++;
        }
        
        lines.splice(insertPos, 0, newEntry);
        fs.writeFileSync(sidebarPath, lines.join('\n'));
      } else {
        // 父目录未找到，简单添加到最后
        sidebarContent += `\n* [${dirName}](${relativePath})`;
        fs.writeFileSync(sidebarPath, sidebarContent);
      }
    } else {
      // 添加到根目录
      sidebarContent += `\n* [${dirName}](${relativePath})`;
      fs.writeFileSync(sidebarPath, sidebarContent);
    }
  } catch (error) {
    console.error('更新侧边栏失败:', error);
  }
}

// 更新侧边栏文件（目录重命名后）
function updateSidebarAfterDirectoryRename(dirPath, oldName, newName) {
  const sidebarPath = path.join(__dirname, '_sidebar.md');
  try {
    let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    
    // 构建旧路径和新路径的模式用于替换
    const oldPattern = new RegExp(`\\[${oldName}\\]\\((${dirPath}/${oldName}/.*?)\\)`, 'g');
    const newReplacement = `[${newName}]($1)`.replace(oldName, newName);
    
    // 替换目录名称引用
    sidebarContent = sidebarContent.replace(oldPattern, newReplacement);
    
    // 替换文件路径中的目录名
    const pathPattern = new RegExp(`\\(${dirPath}/${oldName}/`, 'g');
    const pathReplacement = `(${dirPath}/${newName}/`;
    sidebarContent = sidebarContent.replace(pathPattern, pathReplacement);
    
    fs.writeFileSync(sidebarPath, sidebarContent);
  } catch (error) {
    console.error('更新侧边栏失败 (目录重命名):', error);
  }
}

// 更新侧边栏文件（文件重命名后）
function updateSidebarAfterFileRename(directory, oldName, newName) {
  const sidebarPath = path.join(__dirname, '_sidebar.md');
  try {
    let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    
    // 获取不含扩展名的新旧文件名
    const oldNameNoExt = oldName.replace('.md', '');
    const newNameNoExt = newName.replace('.md', '');
    
    // 构建旧链接和新链接的模式用于替换
    const oldLinkPattern = new RegExp(`\\[${oldNameNoExt}\\]\\(${directory}/${oldName}\\)`, 'g');
    const newLink = `[${newNameNoExt}](${directory}/${newName})`;
    
    // 替换文件链接
    sidebarContent = sidebarContent.replace(oldLinkPattern, newLink);
    
    fs.writeFileSync(sidebarPath, sidebarContent);
  } catch (error) {
    console.error('更新侧边栏失败 (文件重命名):', error);
  }
}

// 更新侧边栏文件（目录删除后）
function updateSidebarAfterDirectoryDelete(dirPath) {
  const sidebarPath = path.join(__dirname, '_sidebar.md');
  try {
    let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    const lines = sidebarContent.split('\n');
    const filteredLines = [];
    let skipNextIndented = false;
    let skipIndentLevel = 0;
    
    // 扫描每一行，移除被删除目录的条目及其子条目
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      
      // 检查缩进级别
      const indentMatch = line.match(/^(\s*)[*-]/);
      
      if (skipNextIndented && indentMatch) {
        const spaces = indentMatch[1].length;
        const currentIndent = spaces / 2; // 假设每级缩进是2个空格
        
        // 如果当前行的缩进级别大于要跳过的级别，则跳过这一行
        if (currentIndent > skipIndentLevel) {
          continue;
        } else {
          // 缩进级别不再大于要跳过的级别，停止跳过
          skipNextIndented = false;
        }
      }
      
      // 检查是否是要删除的目录
      const dirMatch = new RegExp(`\\[(.*?)\\]\\(${dirPath}/.*?\\)`);
      if (line.match(dirMatch)) {
        if (indentMatch) {
          const spaces = indentMatch[1].length;
          skipIndentLevel = spaces / 2;
          skipNextIndented = true;
        }
        continue; // 跳过这一行
      }
      
      filteredLines.push(line);
    }
    
    fs.writeFileSync(sidebarPath, filteredLines.join('\n'));
  } catch (error) {
    console.error('更新侧边栏失败 (目录删除):', error);
  }
}

// 更新侧边栏文件（文件删除后）
function updateSidebarAfterFileDelete(filePath) {
  const sidebarPath = path.join(__dirname, '_sidebar.md');
  try {
    let sidebarContent = fs.readFileSync(sidebarPath, 'utf8');
    const fileNameWithExt = path.basename(filePath);
    const fileNameWithoutExt = fileNameWithExt.replace('.md', '');
    const directory = path.dirname(filePath);
    
    // 构建文件链接的正则模式
    const fileLinkPattern = new RegExp(`\\s*\\*\\s+\\[${fileNameWithoutExt}\\]\\(${filePath}\\)\\s*\n?`, 'g');
    
    // 从侧边栏中移除文件链接
    sidebarContent = sidebarContent.replace(fileLinkPattern, '');
    
    // 处理可能的多余空行
    sidebarContent = sidebarContent.replace(/\n\n+/g, '\n\n');
    
    fs.writeFileSync(sidebarPath, sidebarContent);
  } catch (error) {
    console.error('更新侧边栏失败 (文件删除):', error);
  }
}

// 启动服务器
app.listen(port, () => {
  console.log(`管理服务器运行在 http://localhost:${port}`);
});