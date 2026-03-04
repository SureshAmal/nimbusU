const fs = require('fs');
let content = fs.readFileSync('app/(authenticated)/admin/academics/page.tsx', 'utf8');

// Wrap Semesters table
content = content.replace(
    /<Table aria-label="Semesters">/g,
    '<div className="overflow-auto border-b border-border sm:border-0 sm:pb-0" style={{ maxHeight: "calc(100vh - 18rem)" }}>\n                    <Table aria-label="Semesters">'
);
content = content.replace(
    /<\/Table.Body>\n\s*<\/Table>\n\n\s*<div className="border-t border-secondary px-4 py-2 text-xs text-muted-foreground">\n\s*\{filteredSemesters.length\} semester/g,
    '</Table.Body>\n                  </Table>\n                  </div>\n\n                  <div className="border-t border-secondary px-4 py-2 text-xs text-muted-foreground">\n                    {filteredSemesters.length} semester'
);

// Wrap Courses table 
content = content.replace(
    /<Table aria-label="Courses">/g,
    '<div className="overflow-auto border-b border-border sm:border-0 sm:pb-0" style={{ maxHeight: "calc(100vh - 18rem)" }}>\n                    <Table aria-label="Courses">'
);
content = content.replace(
    /<\/Table.Body>\n\s*<\/Table>\n\n\s*<div className="border-t border-secondary px-4 py-2 text-xs text-muted-foreground">\n\s*\{filteredCourses.length\} course/g,
    '</Table.Body>\n                  </Table>\n                  </div>\n\n                  <div className="border-t border-secondary px-4 py-2 text-xs text-muted-foreground">\n                    {filteredCourses.length} course'
);

// Wrap Offerings table
content = content.replace(
    /<Table aria-label="Offerings">/g,
    '<div className="overflow-auto border-b border-border sm:border-0 sm:pb-0" style={{ maxHeight: "calc(100vh - 18rem)" }}>\n                    <Table aria-label="Offerings">'
);
content = content.replace(
    /<\/Table.Body>\n\s*<\/Table>\n\n\s*<div className="border-t border-secondary px-4 py-2 text-xs text-muted-foreground">\n\s*\{filteredOfferings.length\} offering/g,
    '</Table.Body>\n                  </Table>\n                  </div>\n\n                  <div className="border-t border-secondary px-4 py-2 text-xs text-muted-foreground">\n                    {filteredOfferings.length} offering'
);

// Make Headers Sticky
content = content.replace(/<Table.Header>/g, '<Table.Header className="sticky top-0 z-10 bg-secondary/95 backdrop-blur shadow-sm">');

fs.writeFileSync('app/(authenticated)/admin/academics/page.tsx', content);
console.log("Fixed layout constraints successfully");
