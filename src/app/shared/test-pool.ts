export interface TestQuestion {
  question: string;
  options: string[];
  correctIndex: number;
}

export const Test_POOL: { [category: string]: TestQuestion[] } = {
  'technical': [
    { question: 'What does HTML stand for?', options: ['Hyper Text Markup Language', 'High Text Markup Language', 'Hyper Tabular Markup Language', 'Hyper Text Makeup Language'], correctIndex: 0 },
    { question: 'Which programming language is mainly used for web styling?', options: ['Python', 'CSS', 'JavaScript', 'SQL'], correctIndex: 1 },
    { question: 'What is the purpose of a database?', options: ['To compile code', 'To design web layouts', 'To store and organize data', 'To run shell scripts'], correctIndex: 2 },
    { question: 'Which of the following is NOT a JavaScript framework?', options: ['Angular', 'React', 'Vue', 'Django'], correctIndex: 3 },
    { question: 'What does CSS stand for?', options: ['Creative Style Sheets', 'Cascading Style Sheets', 'Computer Style Sheets', 'Colorful Style Sheets'], correctIndex: 1 },
    { question: 'Which SQL statement is used to extract data from a database?', options: ['SELECT', 'EXTRACT', 'GET', 'OPEN'], correctIndex: 0 },
    { question: 'How do you create a function in JavaScript?', options: ['function = myFunction()', 'function myFunction()', 'create myFunction()', 'function:myFunction()'], correctIndex: 1 },
    { question: 'What is the correct syntax for referring to an external script named "xxx.js"?', options: ['<script href="xxx.js">', '<script name="xxx.js">', '<script src="xxx.js">', '<script file="xxx.js">'], correctIndex: 2 },
    { question: 'Which HTML element is used to define an unordered list?', options: ['<ul>', '<ol>', '<li>', '<list>'], correctIndex: 0 },
    { question: 'What does SQL stand for?', options: ['Strong Query Language', 'Structured Question Language', 'Structured Query Language', 'Standard Query Language'], correctIndex: 2 },
    { question: 'In Java, how do you declare a variable that cannot be modified?', options: ['const', 'final', 'static', 'immutable'], correctIndex: 1 },
    { question: 'What is the default port number for HTTP requests?', options: ['443', '21', '80', '8080'], correctIndex: 2 },
    { question: 'Which data structure follows the Last-In-First-Out (LIFO) principle?', options: ['Queue', 'Stack', 'Linked List', 'Tree'], correctIndex: 1 },
    { question: 'What is the time complexity of searching in a balanced binary search tree?', options: ['O(1)', 'O(n)', 'O(log n)', 'O(n^2)'], correctIndex: 2 },
    { question: 'Which git command is used to record changes in the repository?', options: ['git push', 'git commit', 'git add', 'git save'], correctIndex: 1 },
    { question: 'What does API stand for?', options: ['Application Programming Interface', 'Access Program Integration', 'Applied Protocol Interface', 'Advanced Programming Interaction'], correctIndex: 0 },
    { question: 'Which HTTP method is used to update an existing resource?', options: ['GET', 'POST', 'PUT', 'DELETE'], correctIndex: 2 },
    { question: 'In CSS, how do you select an element with id "header"?', options: ['.header', '#header', '*header', 'header'], correctIndex: 1 },
    { question: 'What is the role of an ORM?', options: ['To optimize server bandwidth', 'To translate relational databases to objects', 'To run automated unit tests', 'To compile web assets'], correctIndex: 1 },
    { question: 'Which company developed the Java programming language?', options: ['Microsoft', 'Google', 'Sun Microsystems', 'Apple'], correctIndex: 2 },
    { question: 'What is the purpose of Git?', options: ['Version control', 'Web hosting', 'Database management', 'Project styling'], correctIndex: 0 },
    { question: 'What is the output of `typeof null` in JavaScript?', options: ['"null"', '"undefined"', '"object"', '"boolean"'], correctIndex: 2 },
    { question: 'Which HTML5 tag is used to display video content?', options: ['<media>', '<video>', '<play>', '<source>'], correctIndex: 1 },
    { question: 'Which SQL keyword is used to sort the result-set?', options: ['SORT BY', 'ORDER BY', 'ALIGN BY', 'GROUP BY'], correctIndex: 1 },
    { question: 'What does JSON stand for?', options: ['JavaScript Object Notation', 'Java Standard Object Network', 'Junction Serialized Object Namespace', 'JavaScript Online Notation'], correctIndex: 0 },
    { question: 'Which protocol is secure and encrypts data transmission?', options: ['HTTP', 'FTP', 'HTTPS', 'SMTP'], correctIndex: 2 },
    { question: 'What is the purpose of the `break` statement in a loop?', options: ['To pause the loop', 'To exit the loop immediately', 'To skip the current iteration', 'To restart the loop'], correctIndex: 1 },
    { question: 'Which of the following is a NoSQL database?', options: ['PostgreSQL', 'MySQL', 'MongoDB', 'SQLite'], correctIndex: 2 },
    { question: 'What does DOM stand for?', options: ['Document Object Model', 'Data Output Mode', 'Digital Optic Media', 'Desktop Operation Manager'], correctIndex: 0 },
    { question: 'Which symbol is used for single-line comments in JavaScript?', options: ['//', '/*', '#', '<!--'], correctIndex: 0 },
    { question: 'What is the primary function of a web server?', options: ['To design images', 'To store database records', 'To serve web pages to clients', 'To compile code libraries'], correctIndex: 2 },
    { question: 'In web security, what does CSRF stand for?', options: ['Cross-Site Request Forgery', 'Client-Side Resource Fetching', 'Cyber Security Response Forum', 'Credential Security Rules Framework'], correctIndex: 0 },
    { question: 'Which CSS property controls the text size?', options: ['font-style', 'text-size', 'font-size', 'text-style'], correctIndex: 2 },
    { question: 'What does REST stand for?', options: ['Representational State Transfer', 'Response State Terminal', 'Repository Standard Transfer', 'Remote Execution System Tool'], correctIndex: 0 },
    { question: 'Which language is used for writing PostgreSQL functions?', options: ['PL/pgSQL', 'PL/SQL', 'T-SQL', 'pgScript'], correctIndex: 0 }
  ],
  'soft-skills': [
    { question: 'What is the most critical component of active listening?', options: ['Formulating your response while they talk', 'Nodding your head constantly', 'Giving full attention and understanding the message', 'Interrupting to show agreement'], correctIndex: 2 },
    { question: 'What is empathy in a professional setting?', options: ['Feeling sorry for others', 'Understanding and sharing others\' feelings', 'Agreeing with everything others say', 'Helping coworkers with their personal finances'], correctIndex: 1 },
    { question: 'Which communication style is respectful yet firm?', options: ['Passive', 'Aggressive', 'Passive-Aggressive', 'Assertive'], correctIndex: 3 },
    { question: 'What is the main goal of constructive feedback?', options: ['To criticize poor performance', 'To encourage improvement and growth', 'To demonstrate superior knowledge', 'To enforce strict discipline'], correctIndex: 1 },
    { question: 'How can you resolve a conflict with a coworker?', options: ['Ignore the coworker completely', 'Discuss the issue calmly and seek a compromise', 'Complain directly to upper management', 'Argue until they agree with you'], correctIndex: 1 },
    { question: 'What does "EQ" stand for?', options: ['Educational Quotient', 'Emotional Intelligence Quotient', 'Equality Quotient', 'Environmental Quality'], correctIndex: 1 },
    { question: 'Which is a positive trait of a team player?', options: ['Working in isolation', 'Sharing credit for successes', 'Avoiding team discussions', 'Focusing only on personal tasks'], correctIndex: 1 },
    { question: 'Why is time management important?', options: ['It allows you to work slower', 'It reduces stress and increases productivity', 'It ensures you work overtime', 'It helps impress your colleagues'], correctIndex: 1 },
    { question: 'What is the first step in problem-solving?', options: ['Brainstorming solutions', 'Identifying the root problem', 'Implementing quick fixes', 'Assigning blame to others'], correctIndex: 1 },
    { question: 'What does professional integrity mean?', options: ['Dressing formally', 'Adhering to ethical and moral principles', 'Always agreeing with supervisors', 'Working fast without breaks'], correctIndex: 1 },
    { question: 'How should you prepare for a presentation?', options: ['Write down everything and read it directly', 'Practice speaking clearly and know your audience', 'Wing it to look natural', 'Use complex vocabulary to impress'], correctIndex: 1 },
    { question: 'What is adaptability in the workplace?', options: ['Refusing to change routines', 'Quickly adjusting to new conditions and workflows', 'Complaining about new software', 'Delegating all new tasks to others'], correctIndex: 1 },
    { question: 'Which attitude fosters innovation?', options: ['Resisting new ideas', 'Curiosity and openness to change', 'Strict compliance with tradition', 'Fear of making mistakes'], correctIndex: 1 },
    { question: 'What does body language contribute to communication?', options: ['It has no impact', 'It conveys non-verbal feelings and attitudes', 'It is only useful in public speaking', 'It replaces verbal communication completely'], correctIndex: 1 },
    { question: 'What is a core benefit of cultural diversity in teams?', options: ['Fewer meetings', 'A wider range of perspectives and ideas', 'Easier agreement on tasks', 'Shorter workdays'], correctIndex: 1 },
    { question: 'What is the best way to handle workload stress?', options: ['Working longer hours without sleep', 'Prioritizing tasks and taking short breaks', 'Ignoring deadlines until they pass', 'Complaining to clients'], correctIndex: 1 },
    { question: 'Which of the following represents a growth mindset?', options: ['Believing your skills are fixed', 'Viewing challenges as opportunities to learn', 'Avoiding tasks where you might fail', 'Ignoring constructive feedback'], correctIndex: 1 },
    { question: 'How can you demonstrate leadership without a title?', options: ['Telling others what to do', 'Taking initiative and supporting team goals', 'Avoiding difficult choices', 'Arriving late to show importance'], correctIndex: 1 },
    { question: 'What is the main purpose of building professional networks?', options: ['To collect business cards', 'To share knowledge and explore opportunities', 'To boast about your career', 'To find shortcuts in work'], correctIndex: 1 },
    { question: 'What is the ideal outcome of negotiation?', options: ['Win-Lose situation', 'Lose-Lose compromise', 'Win-Win solution', 'No agreement at all'], correctIndex: 2 },
    { question: 'Which behavior builds trust in a team?', options: ['Keeping information private', 'Being transparent and keeping promises', 'Avoiding accountability', 'Focusing on individual gains'], correctIndex: 1 },
    { question: 'What is critical thinking?', options: ['Finding faults in others\' work', 'Objective analysis and evaluation of issues', 'Memorizing rules and data', 'Making fast decisions without data'], correctIndex: 1 },
    { question: 'How do you handle constructive criticism?', options: ['Become defensive and argue', 'Listen carefully, reflect, and make improvements', 'Ignore it completely', 'Avoid the person who criticized you'], correctIndex: 1 },
    { question: 'What is work ethic?', options: ['A set of rules for office clothing', 'A belief in the moral benefit of work', 'Working only when watched', 'A contract signed with HR'], correctIndex: 1 },
    { question: 'Why is clear written communication important?', options: ['It uses more paper', 'It prevents misunderstandings and saves time', 'It allows using complex jargon', 'It displays academic degrees'], correctIndex: 1 }
  ],
  'creative': [
    { question: 'Which color model is primarily used for digital displays?', options: ['CMYK', 'RGB', 'RYB', 'Pantone'], correctIndex: 1 },
    { question: 'What is the term for the space between lines of text?', options: ['Kerning', 'Tracking', 'Leading', 'Spacing'], correctIndex: 2 },
    { question: 'What is a moodboard?', options: ['A chart tracking team mood', 'A collection of visual materials defining style', 'A screen displaying server status', 'A list of project goals'], correctIndex: 1 },
    { question: 'Which of the following is a primary color?', options: ['Green', 'Orange', 'Blue', 'Purple'], correctIndex: 2 },
    { question: 'What is the rule of thirds in design?', options: ['Dividing assets into three equal sizes', 'Aligning key elements on grid intersections', 'Limiting color usage to three colors', 'Creating three design drafts'], correctIndex: 1 },
    { question: 'What does "typography" deal with?', options: ['Study of digital cameras', 'Design and arrangement of typefaces', 'Methods of print binding', 'Writing advertising scripts'], correctIndex: 1 },
    { question: 'Which design format is resolution-independent?', options: ['Raster image (.png)', 'Vector graphic (.svg)', 'Bitmap graphic (.bmp)', 'JPEG image (.jpg)'], correctIndex: 1 },
    { question: 'What is "kerning" in typography?', options: ['Spacing between lines', 'Adjusting space between individual characters', 'Setting overall paragraph indentation', 'Changing letter thickness'], correctIndex: 1 },
    { question: 'What is the purpose of wireframing in UX design?', options: ['Creating high-fidelity graphics', 'Defining structure and page layouts', 'Writing frontend CSS styling', 'Running user usability interviews'], correctIndex: 1 },
    { question: 'Which color harmony uses colors opposite each other on the color wheel?', options: ['Analogous', 'Complementary', 'Monochromatic', 'Triadic'], correctIndex: 1 },
    { question: 'What does "UX" stand for in design?', options: ['User Experience', 'Unique Exchange', 'User Extension', 'Unified eXpression'], correctIndex: 0 },
    { question: 'What is the main function of white space (negative space)?', options: ['It makes pages look empty', 'It improves readability and structure', 'It saves ink in printing', 'It hides loading assets'], correctIndex: 1 },
    { question: 'Which font style is characterized by small lines at the ends of characters?', options: ['Sans-serif', 'Serif', 'Monospace', 'Display'], correctIndex: 1 },
    { question: 'In color theory, what is a "tint"?', options: ['Color mixed with gray', 'Color mixed with black', 'Color mixed with white', 'Pure color hue'], correctIndex: 2 },
    { question: 'What is a storyboard in video production?', options: ['A budget sheet for shooting', 'A sequence of illustrations planning the video', 'A database storing video footage', 'A list of script revisions'], correctIndex: 1 },
    { question: 'What is the definition of "contrast"?', options: ['Using similar shapes and colors', 'The difference in visual properties of elements', 'Repeating layout structures', 'Aligning blocks on the page center'], correctIndex: 1 },
    { question: 'Which software is best suited for vector illustrations?', options: ['Adobe Photoshop', 'Adobe Illustrator', 'Adobe Premiere', 'Adobe InDesign'], correctIndex: 1 },
    { question: 'What does "UI" stand for in design?', options: ['User Interface', 'User Interaction', 'Unified Intelligence', 'Unique Integration'], correctIndex: 0 },
    { question: 'What is a "gradient"?', options: ['A grid for aligning layout elements', 'A smooth transition between colors', 'A method of compressing visual files', 'A test measuring design performance'], correctIndex: 1 },
    { question: 'What is hierarchy in graphic design?', options: ['The ordering of team members', 'Arranging elements to show order of importance', 'The speed of drawing assets', 'A folder structure for assets'], correctIndex: 1 },
    { question: 'What is the main goal of a call-to-action (CTA) button?', options: ['To display warning messages', 'To prompt the user to take a specific action', 'To animate page transitions', 'To link to terms of service'], correctIndex: 1 },
    { question: 'In photo editing, what does "saturation" control?', options: ['The size of the photo', 'The intensity or purity of colors', 'The brightness of the highlights', 'The crop boundaries'], correctIndex: 1 },
    { question: 'What is the purpose of a style guide?', options: ['To rate employee fashion', 'To maintain visual consistency across a brand', 'To list legal copyright terms', 'To schedule website updates'], correctIndex: 1 },
    { question: 'Which file format supports transparency?', options: ['.jpg', '.png', '.bmp', '.pdf'], correctIndex: 1 },
    { question: 'What is a mockup?', options: ['A sketch drawn on paper', 'A mid-to-high-fidelity representation of design', 'A script generating fake data', 'An interview criticising bad design'], correctIndex: 1 }
  ]
};

/**
 * Shuffles and extracts 20 to 25 random questions from the pool.
 */
export function getRandomTest(category: string, questionCount: number = 20): TestQuestion[] {
  const pool = Test_POOL[category] || Test_POOL['technical'];
  
  // Shuffle pool using Fisher-Yates algorithm
  const shuffled = [...pool];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  // Slice to requested count (clamped between 20 and 25)
  const count = Math.min(Math.max(questionCount, 20), 25);
  return shuffled.slice(0, count);
}
