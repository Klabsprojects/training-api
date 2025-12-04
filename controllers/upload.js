const multer = require('multer');
const path = require('path');


// Set up storage engine
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        let destPath = '/home/masclass/training/uploads/public/';
        
        if (file.fieldname === 'photo') {
            destPath = '/home/masclass/training/uploads/photos/';
        }

        cb(null, destPath);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// Init upload
const upload = multer({storage: storage, limits: { fileSize: 10000000 }, fileFilter: (req, file, cb) => {checkFileType(file, cb);}}).fields([{ name: 'file', maxCount: 1 }, { name: 'photo', maxCount: 1 }]);

// Check File Type
function checkFileType(file, cb) {
    const filetypes = /jpeg|jpg|png|webp|gif|pdf|doc|docx|ppt|pptx/;
    const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = filetypes.test(file.mimetype);

    if (mimetype && extname) {
        return cb(null, true);
    } else {
        cb('Error: Images Only!');
    }
}

// Upload endpoint
exports.file = (req, res) => {
    upload(req, res, (err) => {
        if (err) {
            res.status(400).json({ error: true, message: err });
        } else {
            if (!req.files || (!req.files.photo && !req.files.file))
                res.status(400).json({ error: true, message: 'No file selected' });
            else {
                let filename = '';
                if(req.files.photo)
                    filename = req.files.photo[0].filename;
                else if(req.files.file) 
                    filename = req.files.file[0].filename;
                res.json({
                    error: false,
                    message: 'File uploaded successfully',
                    file: filename
                });
            }
        }
    });
};
