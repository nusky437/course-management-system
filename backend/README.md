GET    /api/courses
GET    /api/courses/:id

POST   /api/courses
PUT    /api/courses/:id
DELETE /api/courses/:id

POST   /api/enrollments
GET    /api/enrollments/my
GET    /api/enrollments
GET    /api/enrollments/course/:courseId
DELETE /api/enrollments/:id

GET    /api/users/username/:username
GET    /api/users/:id
GET    /api/users/me
PUT    /api/users/me
PUT    /api/users/me/password

Password changes are limited to 5 incorrect current-password attempts per
account in a 15-minute window. Further requests during that window return HTTP 429.
