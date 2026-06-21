import re

with open('D:/All Backends/Siksha Setu/Siksha-Setu/src/main/java/com/example/Siksha/Setu/controller/StudentAnalyticsController.java', 'r', encoding='utf-8') as f:
    content = f.read()

# Fix the stray lines
stray_pattern = re.compile(r'\s*return ResponseEntity\.ok\(enrollmentOpt\.get\(\)\);\s*\}\s*Map<String, Object> response = new HashMap<>\(\);\s*response\.put\("enrolled", false\);\s*return ResponseEntity\.ok\(response\);\s*\}', re.DOTALL)

# Find the second occurrence and remove it
matches = list(stray_pattern.finditer(content))
if len(matches) > 1:
    content = content[:matches[1].start()] + content[matches[1].end():]

# Now, update enrollInCourse
# Find enrollInCourse method and insert calculateAndSaveProgress(enrollment); before return
enroll_pattern = re.compile(r'(enrollmentRepository\.save\(enrollment\);\s*// Update overall preference.*?activityTrackerRepository\.save.*?\} catch \(Exception e\) \{\}\s*)(return ResponseEntity\.ok\(enrollment\);)', re.DOTALL)
content = enroll_pattern.sub(r'\1calculateAndSaveProgress(enrollment);\n        return ResponseEntity.ok(enrollment);', content)

# Update completeResource
complete_pattern = re.compile(r'(// Calculate progress\s*List<com\.example\.Siksha\.Setu\.StudyResource> totalResources.*?)(\s*return ResponseEntity\.ok\(enrollment\);)', re.DOTALL)
content = complete_pattern.sub(r'calculateAndSaveProgress(enrollment);\n        \2', content)

# Add lastOpenedResourceId endpoint
last_opened_endpoint = '''
    // Save last opened resource
    @PutMapping("/{userId}/course/{courseId}/last-opened/{resourceId}")
    public ResponseEntity<?> saveLastOpenedResource(
            @PathVariable String userId,
            @PathVariable String courseId,
            @PathVariable Long resourceId) {
        Optional<Enrollment> enrollmentOpt = enrollmentRepository.findByUser_DisabilityIdAndCourse_Id(userId, courseId);
        if (enrollmentOpt.isEmpty()) {
            return ResponseEntity.badRequest().body("Enrollment not found");
        }
        Enrollment enrollment = enrollmentOpt.get();
        enrollment.setLastOpenedResourceId(resourceId);
        enrollmentRepository.save(enrollment);
        return ResponseEntity.ok(enrollment);
    }
'''

content = content.replace('    // Complete resource', last_opened_endpoint + '\n    // Complete resource')

with open('D:/All Backends/Siksha Setu/Siksha-Setu/src/main/java/com/example/Siksha/Setu/controller/StudentAnalyticsController.java', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done updating StudentAnalyticsController.java")
