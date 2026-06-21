const fs = require('fs');
const file = 'd:\\All Frontend\\SikshaSetu\\src\\app\\dashboard\\course-dashboard\\course-dashboard.component.html';
let content = fs.readFileSync(file, 'utf-8');

const mapping = {
  'text': "!isCategoryEnabled('text') ? 'bi-lock-fill text-muted me-2' : 'bi-journal-text me-2'",
  'video': "!isCategoryEnabled('video') ? 'bi-lock-fill text-muted me-2' : 'bi-play-btn me-2'",
  'audio': "!isCategoryEnabled('audio') ? 'bi-lock-fill text-muted me-2' : 'bi-mic me-2'",
  'sign': "!isCategoryEnabled('sign') ? 'bi-lock-fill text-muted me-2' : 'bi-person-badge me-2'",
  'braille': "!isCategoryEnabled('braille') ? 'bi-lock-fill text-muted me-2' : 'bi-keyboard me-2'"
};

content = content.replace(/<div class="d-flex align-items-center flex-grow-1 text-truncate pe-2"><i class="bi flex-shrink-0" \[ngClass\]=""><\/i><span class="text-truncate small ms-2">{{ res\.title }}<\/span><\/div>\s*<i class="bi bi-check-circle-fill text-success ms-2" \*ngIf="isCategoryEnabled\('([^']+)'\)/g, function(match, cat) {
  const ngClass = mapping[cat];
  return `<div class="d-flex align-items-center flex-grow-1 text-truncate pe-2"><i class="bi flex-shrink-0" [ngClass]="${ngClass}"></i><span class="text-truncate small ms-2">{{ res.title }}</span></div>
                          <i class="bi bi-check-circle-fill text-success ms-2" *ngIf="isCategoryEnabled('${cat}')`;
});

fs.writeFileSync(file, content);
