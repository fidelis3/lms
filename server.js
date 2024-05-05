//importing the dependencies and defining their variables
const express = require('express');
const session = require('express-session');
const bcrypt = require('bcryptjs');//for encryption
const bodyParser = require('body-parser');
const mysql = require('mysql');
const { check, validationResult } = require('express-validator');
const app = express();

// Configure session middleware
app.use(session({
    secret: 'secret-key',
    resave: false,
    saveUninitialized: true
}));

// Create MySQL connection
const connection = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: 'fivic',
    database: 'learning_management'
});

// Connect to MySQL
connection.connect((err) => {
    if (err) {
        console.error('Error connecting to MySQL: ' + err.stack);
        return;
    }
    console.log('Connected to DB');
});
// Start server
const PORT = 9000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});


// Serve static files from the default directory
app.use(express.static(__dirname));//fetches the static files

// Set up middleware(interface btwn 2 parties(frontend and backend)) to parse incoming JSON data
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));//true because we want the extended version  
app.use(bodyParser.urlencoded({ extended: true }));

// Define routes(landing page)req-request res-response
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});
// Define a User representation for clarity
const User = {
    tableName: 'users', 
    createUser: function(newUser, callback) {
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);//newuser is a variable where we'll get our values from
    },  
    getUserByEmail: function(email, callback) {//select is used to fetch data(fetch user by email and by username)
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', email, callback);
    },
    getUserByUsername: function(username, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', username, callback);
    }
};

// Registration route
app.post('/register', [
    // Validate email and username fields,confirm it is a valid email and  whether username is alphanumeric
    check('email').isEmail(),
    check('username').isAlphanumeric().withMessage('Username must be alphanumeric'),

    // Custom validation to check if email and username are unique
    check('email').custom(async (value) => {
        const user = await User.getUserByEmail(value);
        if (user) {
            throw new Error('Email already exists');
        }
    }),
    check('username').custom(async (value) => {
        const user = await User.getUserByUsername(value);
        if (user) {
            throw new Error('Username already exists');
        }
    }),
    //request handler(asyncronous request) 400-http code .json-modify data to json using json method array-pass on the erroes as array !error is empty-error is not empty
], async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
    }

    // Hash the password-not to store the password in plaintext 
    const saltRounds = 10;
    //req.body.password-access the request then the body then the password because the password is in the body
    const hashedPassword = await bcrypt.hash(req.body.password, saltRounds);

    // Create a new user object
    const newUser = {
        email: req.body.email,
        username: req.body.username,
        password: hashedPassword,
        full_name: req.body.full_name
    };

    // Insert user into MySQL
    User.createUser(newUser, (error, results, fields) => {
        if (error) {
          console.error('Error inserting user: ' + error.message);
          return res.status(500).json({ error: error.message });
        }
        console.log('Inserted a new user with id ' + results.insertId);
        res.status(201).json(newUser);
      });
});

// Login route
app.post('/login', (req, res) => {
    const { username, password } = req.body;
    // Retrieve user from database
    connection.query('SELECT * FROM users WHERE username = ?', [username], (err, results) => {
        if (err) throw err;
        if (results.length === 0) {
            res.status(401).send('Invalid username or password');
        } else {
            const user = results[0];
            // Compare passwords
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if (err) throw err;
                if (isMatch) {
                    // Store user in session
                    req.session.user = user;
                    res.send('Login successful');
                } else {
                    res.status(401).send('Invalid username or password');
                }
            });
        }
    });
});

// Logout route
app.post('/logout', (req, res) => {
    req.session.destroy();
    res.send('Logout successful');
});

//Dashboard route
app.get('/dashboard', (req, res) => {
    // Assuming you have middleware to handle user authentication and store user information in req.user
    const userFullName = req.user.full_name;
    res.render('dashboard', { fullName: userFullName });
});

// Route to retrieve course content
app.get('/course/:id', (req, res) => {
    const courseId = req.params.id;
    const sql = 'SELECT * FROM courses WHERE id = ?';
    db.query(sql, [courseId], (err, result) => {
      if (err) {
        throw err;
      }
      // Send course content as JSON response
      res.json(result);
    });
  });
    const loggedin_user={
    getUserCourse:function(userId,callback){
        connection.query('SELECT*FROM user_courses WHERE user_id=?',userId,callback);
    },
    addUserCourse:function(userId,courseId,callback){
        const newUserCourse={user_id:userId,course_id:courseId};
        connection.query('INSERT INTO user_courses SET?',newUserCourse,callback);
    }
};
//route to display courses and allow users to select their preffered courses
app.get('/courses',(req,res) => {
    connection.query('SELECT*FROM courses',(err,courses) =>{
        if(err){
            console.error('Error retrieving courses:'+err.message);
            return res.status(500).json({error:err.message});
        }
        res.render('courses',{courses});
    });
});
//route to handle adding a course selection for a user
app.post('/courses/select',(req,res)=>{
    const{userId,courseId}=req.body;
 User.addUserCourse(userId,courseId,(error,result)=>{
    if (error){
        console.error('error adding user course:+error.message');
        return res.status(500).json({error:error.message});
    }
    res.status(201).json({message:'course selected succesfully'});
 });
});
//route to display selected course
app.get('/courses/:userId',(req,res)=>{
    const userId=req.params.userId;
    User.getUserCourses(userId,(error,userCourses)=>{
        if(error){
            console.error('error retrieving user courses:'+ error.message);
            return res.status(500).json({error:error.message});
        }
        res.render('user_courses',{userCourses});
    });
});
const course = {
    tableName: 'courses', 
    getcourserByName: function(coursename, callback) {
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE coursename = ?', coursename, callback);

    }
};
