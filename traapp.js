require('dotenv').config();

const express = require('express');
const cors = require('cors');

const rt_mst = require('./routes/master');
const rt_frm = require('./routes/forms');
const rt_qust = require('./routes/quest');
const rt_part = require('./routes/participant');
const rt_usr = require('./routes/users');
const rt_naut = require('./routes/noauth');
const rt_res = require('./routes/response');
const rt_tra = require('./routes/training');
const rt_upload = require('./routes/upload');

const port = process.env.PORT || 3003;
const app = express();

app.use(express.json());
app.use(cors());
function verifyToken(req, res, next) {
  const jwt = require('jsonwebtoken');
  const token = req.headers.authorization;
  if (!token)
    return res.status(401).json({ message: 'Unauthorized: Token missing' });  

  jwt.verify(token, 'T@3Fo@l0g', (err, user) => {
    if (err) 
      return res.status(401).json({ message: 'Unauthorized: Invalid token' });    
    req.user = user;
    next();
  });
}

// Use the routes
app.use('/master', verifyToken, rt_mst);
app.use('/forms', verifyToken, rt_frm);
app.use('/quest', verifyToken,rt_qust);
app.use('/member', verifyToken, rt_part);
app.use('/user', verifyToken, rt_usr);
app.use('/response', verifyToken, rt_res);
// app.use('/training', verifyToken, rt_tra);
app.use('/training', verifyToken, rt_tra);
app.use('/login', rt_naut);
app.use('/mem', rt_naut);
app.use('/upload', rt_upload);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});