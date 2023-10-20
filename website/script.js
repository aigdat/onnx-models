document.addEventListener('DOMContentLoaded', function() {
  const taskFilterOptions = document.querySelectorAll('#task-filters .filter-button');
  const authorFilterContainer = document.getElementById('author-filters');
  const taskFilterContainer = document.getElementById('task-filters');

  let tasksSet = new Set();  // Create a new Set object for tasks
  let currentPage = 1;
  const itemsPerPage = 18;
  let filteredData = [];
  let authorsSet = new Set();

  async function fetchData() {
    const response = await fetch('https://api.github.com/repos/aigdat/onnx-models/git/trees/main?recursive=1');
    const data = await response.json();
    const onnxFiles = data.tree.filter(item => item.path.endsWith('.onnx') && !item.path.includes('archive/'));
    const yamlFiles = data.tree.filter(item => item.path.endsWith('turnkey_stats.yaml'));
    const modelData = [];
    for (const file of onnxFiles) {
      const pathParts = file.path.split('/');
      const parentDir = pathParts.slice(0, -1).join('/');  // Exclude the ONNX filename to get its directory
      const parentDirParts = parentDir.split('/');
      const grandParentDir = parentDirParts.slice(0, -1).join('/');  // Get the parent directory of the ONNX file
      const yamlFile = yamlFiles.find(yaml => yaml.path === `${grandParentDir}/turnkey_stats.yaml`);
      let modelTitle = pathParts[pathParts.length - 1].replace('.onnx', ''); // Default to ONNX file name
      let author = 'False';
      let opset = 'NA';
      let task = 'NA';
      if (yamlFile) {
        const yamlResponse = await fetch(`https://raw.githubusercontent.com/aigdat/onnx-models/main/${yamlFile.path}`);
        const yamlText = await yamlResponse.text();
        const yamlLines = yamlText.split('\n');
        const modelNameLine = yamlLines.find(line => line.startsWith('model_name:'));
        if (modelNameLine) {
          modelTitle = modelNameLine.split(':')[1].trim(); // Override with model name from YAML
        }
        const authorLine = yamlLines.find(line => line.startsWith('author:'));
        const opsetLine = yamlLines.find(line => line.startsWith('opset:'));
        const taskLine = yamlLines.find(line => line.startsWith('task:'));
        if (authorLine) {
          author = authorLine.split(':')[1].trim();
          authorsSet.add(author);
        }
        if (opsetLine) {
          opset = opsetLine.split(':')[1].trim();
        }
        if (taskLine) {
          task = taskLine.split(':')[1].trim();
          tasksSet.add(task);  // Add the task to tasksSet
        }
      }
      modelData.push({
        title: modelTitle,
        description: `Task: ${task}`, 
        author,
        opset,
        downloadUrl: `https://github.com/aigdat/onnx-models/raw/main/${file.path}`
      });
    }
    authorsSet.forEach(author => {
      const authorFilter = document.createElement('div');
      authorFilter.className = 'filter-button';
      authorFilter.setAttribute('data-value', author);
      authorFilter.textContent = author;
      authorFilterContainer.appendChild(authorFilter);
    });
    // Create filter buttons for tasks
    tasksSet.forEach(task => {
      const taskFilter = document.createElement('div');
      taskFilter.className = 'filter-button';
      taskFilter.setAttribute('data-value', task);
      taskFilter.textContent = task;
      taskFilterContainer.appendChild(taskFilter);
    });
    return modelData;
  }

  function renderCards(data) {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = '';
    const start = (currentPage - 1) * itemsPerPage;
    const end = start + itemsPerPage;
    const pageData = data.slice(start, end);
    pageData.forEach(item => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `<h3>${item.title}</h3><p>${item.description}<br>Author: ${item.author}<br>Opset: ${item.opset}</p>`;
      const downloadButton = document.createElement('div');
      downloadButton.className = 'download-button';
      downloadButton.addEventListener('click', () => window.open(item.downloadUrl, '_blank'));
      const downloadArrow = document.createElement('div');
      downloadArrow.className = 'download-arrow';
      downloadButton.appendChild(downloadArrow);
      card.appendChild(downloadButton);
      mainContent.appendChild(card);
    });
    const pageInfo = document.getElementById('page-info');
    const totalPages = Math.ceil(data.length / itemsPerPage);
    pageInfo.textContent = `${currentPage}/${totalPages}`;
  }

  fetchData().then(data => {
    filteredData = data;
    renderCards(data);
    const filterOptions = document.querySelectorAll('.filter-button');
  filterOptions.forEach(option => {
    option.addEventListener('click', function() {
      this.classList.toggle('active');
      const activeFilters = Array.from(document.querySelectorAll('.filter-button.active')).map(btn => btn.getAttribute('data-value'));
        if (activeFilters.length === 0) {
          filteredData = data;
        } else {
          filteredData = data.filter(item => activeFilters.includes(item.author) || activeFilters.includes(item.description.split(': ')[1]));
        }
      currentPage = 1;
      renderCards(filteredData);
    });
  });
  });

  const prevPage = document.getElementById('prev-page');
  const nextPage = document.getElementById('next-page');
  prevPage.addEventListener('click', () => {
    if (currentPage > 1) {
      currentPage--;
      renderCards(filteredData);
    }
  });
  nextPage.addEventListener('click', () => {
    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderCards(filteredData);
    }
  });

  const searchBar = document.getElementById('search-bar');
  searchBar.addEventListener('input', function() {
    const query = this.value.toLowerCase();
    const searchResults = filteredData.filter(item => item.title.toLowerCase().includes(query));
    renderCards(searchResults);
  });
});