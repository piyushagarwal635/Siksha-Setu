const fs = require('fs');

function processFile(file) {
  let content = fs.readFileSync(file, 'utf-8');
  let matches = 0;
  
  // A simple way is to wrap <table ...>...</table>
  // but we should avoid wrapping already wrapped tables.
  
  // We can just use string replacement if we do it carefully.
  // We'll replace '<table' with '<div class="table-responsive"><table'
  // and '</table>' with '</table></div>'
  // But wait, what if they are already wrapped?
  
  // Let's check first.
  if (content.includes('<div class="table-responsive">')) {
    console.log('Already has table-responsive in ' + file);
    return;
  }
  
  content = content.replace(/<table/g, '<div class="table-responsive">\n<table');
  content = content.replace(/<\/table>/g, '</table>\n</div>');
  
  fs.writeFileSync(file, content);
  console.log('Wrapped tables in ' + file);
}

processFile('d:\\All Frontend\\SikshaSetu\\src\\app\\dashboard\\admin-dashboard\\admin-dashboard.component.html');
processFile('d:\\All Frontend\\SikshaSetu\\src\\app\\dashboard\\student-dashboard\\student-dashboard.component.html');
