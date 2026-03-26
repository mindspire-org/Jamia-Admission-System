import express from 'express';
import Student from '../models/Student.js';
import Token from '../models/Token.js';
import { protect, authorize } from '../middleware/auth.js';
import upload from '../middleware/upload.js';
import uploadCertificate from '../middleware/uploadCertificate.js';

const router = express.Router();

const canManageOwnToken = (student, userId) => {
    if (!student) return false;
    if (!student.createdBy) return false;
    return String(student.createdBy) === String(userId);
};

// @route   POST /api/students
// @desc    Create new student token (Counter 1)
// @access  Private (counter1)
router.post('/', protect, authorize('counter1'), upload.single('photo'), async (req, res) => {
    try {
        const studentData = {
            ...req.body,
            photoUrl: req.file ? `/uploads/photos/${req.file.filename}` : null,
            createdBy: req.user._id,
        };

        const student = await Student.create(studentData);

        res.status(201).json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/students/counter2
// @desc    Get students for Counter 2 (pending/verified/rejected)
// @access  Private (counter2)
router.get('/counter2', protect, authorize('counter2'), async (req, res) => {
    try {
        const { status, search } = req.query;
        const query = {
            status: { $in: ['pending', 'verified', 'rejected'] },
        };

        // If user is counter2 and has assignedClasses, restrict view to those classes
        if (req.user.role === 'counter2' && req.user.assignedClasses && req.user.assignedClasses.length > 0) {
            if (!req.user.assignedClasses.includes('all')) {
                query.class = { $in: req.user.assignedClasses };
            }
        }

        if (status && ['pending', 'verified', 'rejected'].includes(String(status))) {
            query.status = String(status);
        }

        if (search) {
            query.$or = [
                { studentName: { $regex: search, $options: 'i' } },
                { tokenNumber: { $regex: search, $options: 'i' } },
                { admissionNumber: { $regex: search, $options: 'i' } },
            ];
        }

        const students = await Student.find(query)
            .populate('createdBy', 'name username')
            .populate('verifiedBy', 'name username')
            .sort({ verifiedAt: -1, createdAt: -1 });

        res.json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/students/counter2/:id
// @desc    Update student record (Counter 2) - only records verified by current counter2
// @access  Private (counter2)
router.put('/counter2/:id', protect, authorize('counter2'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        const isOwner = student.verifiedBy && String(student.verifiedBy) === String(req.user._id);
        const isPendingAndUnclaimed = student.status === 'pending' && !student.verifiedBy;

        // Check class-wise access for counter2
        if (req.user.role === 'counter2' && req.user.assignedClasses && req.user.assignedClasses.length > 0) {
            if (!req.user.assignedClasses.includes('all') && !req.user.assignedClasses.includes(student.class)) {
                return res.status(403).json({
                    success: false,
                    message: `Not authorized to manage students of class ${student.class}.`
                });
            }
        }

        if (!isOwner && !isPendingAndUnclaimed) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to manage this record'
            });
        }

        if (isPendingAndUnclaimed) {
            student.verifiedBy = req.user._id;
        }

        const allowed = [
            'studentName',
            'fatherName',
            'dateOfBirth',
            'age',
            'currentAddress',
            'permanentAddress',
            'cnic',
            'contact',
            'class',
            'category',
            'previousMadrasa',
            'previousClass',
            'performance',
            'wafaqRollNo',
            'notes',
            'status',
        ];

        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                student[key] = req.body[key];
            }
        }

        await student.save();

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/students/counter2/:id
// @desc    Delete student record (Counter 2) - only records verified by current counter2
// @access  Private (counter2)
router.delete('/counter2/:id', protect, authorize('counter2'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        if (!student.verifiedBy || String(student.verifiedBy) !== String(req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to manage this record'
            });
        }

        // Check class-wise access for counter2
        if (req.user.role === 'counter2' && req.user.assignedClasses && req.user.assignedClasses.length > 0) {
            if (!req.user.assignedClasses.includes('all') && !req.user.assignedClasses.includes(student.class)) {
                return res.status(403).json({
                    success: false,
                    message: `Not authorized to delete students of class ${student.class}.`
                });
            }
        }

        await student.deleteOne();

        res.json({
            success: true,
            message: 'Student deleted successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/students/my
// @desc    Get tokens created by current Counter 1
// @access  Private (counter1)
router.get('/my', protect, authorize('counter1'), async (req, res) => {
    try {
        const students = await Student.find({ createdBy: req.user._id })
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/students/my/:id
// @desc    Update own token details (Counter 1)
// @access  Private (counter1)
router.put('/my/:id', protect, authorize('counter1'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        if (!canManageOwnToken(student, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to manage this token'
            });
        }

        const allowed = [
            'studentName',
            'fatherName',
            'dateOfBirth',
            'age',
            'currentAddress',
            'permanentAddress',
            'cnic',
            'contact',
            'class',
            'category',
        ];

        for (const key of allowed) {
            if (Object.prototype.hasOwnProperty.call(req.body, key)) {
                student[key] = req.body[key];
            }
        }

        await student.save();

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   DELETE /api/students/my/:id
// @desc    Delete own token (Counter 1)
// @access  Private (counter1)
router.delete('/my/:id', protect, authorize('counter1'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        if (!canManageOwnToken(student, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to manage this token'
            });
        }

        await student.deleteOne();

        res.json({
            success: true,
            message: 'Token deleted successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   POST /api/students/my/:id/regenerate-token
// @desc    Regenerate token number (Counter 1)
// @access  Private (counter1)
router.post('/my/:id/regenerate-token', protect, authorize('counter1'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        if (!canManageOwnToken(student, req.user._id)) {
            return res.status(403).json({
                success: false,
                message: 'Not authorized to manage this token'
            });
        }

        student.tokenNumber = undefined;
        student.status = 'pending';
        student.verifiedBy = undefined;
        student.verifiedAt = undefined;
        student.admissionNumber = undefined;

        await student.save();

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/students
// @desc    Get all students
// @access  Private (admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
    try {
        const { status, class: className, search } = req.query;

        let query = {};

        if (status) query.status = status;
        if (className) query.class = className;
        if (search) {
            query.$or = [
                { studentName: { $regex: search, $options: 'i' } },
                { tokenNumber: { $regex: search, $options: 'i' } },
                { admissionNumber: { $regex: search, $options: 'i' } },
            ];
        }

        const students = await Student.find(query)
            .populate('createdBy', 'name username')
            .populate('verifiedBy', 'name username')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/students/pending
// @desc    Get pending students for Counter 2
// @access  Private (counter2)
router.get('/pending', protect, authorize('counter2'), async (req, res) => {
    try {
        const students = await Student.find({ status: 'pending' })
            .populate('createdBy', 'name')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   GET /api/students/token/:tokenNumber
// @desc    Get student by token number
// @access  Private (counter2)
router.get('/token/:tokenNumber', protect, authorize('counter2'), async (req, res) => {
    try {
        const tokenNumber = String(req.params.tokenNumber || '').trim();
        let student = await Student.findOne({ tokenNumber })
            .populate('createdBy', 'name username');

        // Check class-wise access for counter2 if student already exists
        if (req.user.role === 'counter2' && req.user.assignedClasses && req.user.assignedClasses.length > 0) {
            if (!req.user.assignedClasses.includes('all') && !req.user.assignedClasses.includes(student.class)) {
                return res.status(403).json({
                    success: false,
                    message: `Not authorized to access students of class ${student.class}.`
                });
            }
        }

        if (!student) {
            const token = await Token.findOne({ tokenNumber }).populate('createdBy', 'name username');
            if (!token) {
                return res.status(404).json({
                    success: false,
                    message: 'Token not found'
                });
            }

            // Check class-wise access for counter2 if token is being converted to student
            if (req.user.role === 'counter2' && req.user.assignedClasses && req.user.assignedClasses.length > 0) {
                if (!req.user.assignedClasses.includes('all') && !req.user.assignedClasses.includes(token.class)) {
                    return res.status(403).json({
                        success: false,
                        message: `Not authorized to access tokens of class ${token.class}.`
                    });
                }
            }

            student = await Student.findOneAndUpdate(
                { tokenNumber },
                {
                    tokenNumber: token.tokenNumber,
                    studentName: token.studentName,
                    fatherName: token.fatherName,
                    dateOfBirth: token.dateOfBirth,
                    age: token.age,
                    currentAddress: token.currentAddress,
                    permanentAddress: token.permanentAddress,
                    cnic: token.cnic,
                    contact: token.contact,
                    class: token.class,
                    testDate: token.testDate,
                    resultDate: token.resultDate,
                    category: token.category,
                    photoUrl: token.photoUrl,
                    status: token.status || 'pending',
                    createdBy: token.createdBy,
                    formData: token.formData && typeof token.formData === 'object' ? token.formData : {},
                },
                { new: true, upsert: true, runValidators: true }
            ).populate('createdBy', 'name username');
        }

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

// @route   PUT /api/students/:id/verify
// @desc    Verify/Reject student (Counter 2)
// @access  Private (counter2)
router.put('/:id/verify', protect, authorize('counter2'), async (req, res) => {
    try {
        const { status, ...verificationData } = req.body;

        const updateData = {
            ...verificationData,
            status,
            verifiedBy: req.user._id,
            verifiedAt: new Date(),
        };

        // Generate admission number if approved
        if (status === 'verified') {
            const year = new Date().getFullYear();
            const count = await Student.countDocuments({ status: 'verified' });
            updateData.admissionNumber = `ADM-${year}-${String(count + 1).padStart(4, '0')}`;
        }

        const student = await Student.findByIdAndUpdate(
            req.params.id,
            updateData,
            { new: true, runValidators: true }
        ).populate('verifiedBy', 'name username');

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

// @route   GET /api/students/verification
// @desc    Get all students for Counter 2 Verification page (admin)
// @access  Private (admin)
router.get('/verification', protect, authorize('admin', 'counter2'), async (req, res) => {
    try {
        const { search, category, status } = req.query;
        const query = {};

        // If user is counter2 and has assignedClasses, restrict view to those classes
        if (req.user.role === 'counter2' && req.user.assignedClasses && req.user.assignedClasses.length > 0) {
            if (!req.user.assignedClasses.includes('all')) {
                query.class = { $in: req.user.assignedClasses };
            }
        }

        if (category && ['Wafaq', 'Non-Wafaq'].includes(String(category))) {
            query.category = String(category);
        }

        if (status) query.status = status;

        if (search) {
            query.$or = [
                { studentName: { $regex: search, $options: 'i' } },
                { tokenNumber: { $regex: search, $options: 'i' } },
                { fatherName: { $regex: search, $options: 'i' } },
            ];
        }

        const students = await Student.find(query)
            .populate('createdBy', 'name username')
            .populate('verifiedBy', 'name username')
            .populate('nonFederalReviewedBy', 'name username')
            .sort({ createdAt: -1 });

        res.json({
            success: true,
            count: students.length,
            data: students,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// @route   PUT /api/students/:id/verification
// @desc    Save Counter 2 verification data (admin)
// @access  Private (admin)
router.put('/:id/verification', protect, authorize('admin', 'counter2'), uploadCertificate.single('certificate'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        if (!student) {
            return res.status(404).json({ success: false, message: 'Student not found' });
        }

        // Check class-wise access for counter2
        if (req.user.role === 'counter2' && req.user.assignedClasses && req.user.assignedClasses.length > 0) {
            if (!req.user.assignedClasses.includes('all') && !req.user.assignedClasses.includes(student.class)) {
                return res.status(403).json({
                    success: false,
                    message: `Not authorized to verify students of class ${student.class}.`
                });
            }
        }

        const { studentType, wafaqRollNo, wafaqExamYear, previousClass,
            federalVerificationStatus, previousMadrasa, madrasaContact,
            nonFederalReviewStatus, notes } = req.body;

        // Common
        student.notes = notes || student.notes;

        if (studentType === 'Wafaq') {
            // Federal
            if (wafaqRollNo !== undefined) student.wafaqRollNo = wafaqRollNo;
            if (wafaqExamYear !== undefined) student.wafaqExamYear = wafaqExamYear;
            if (previousClass !== undefined) student.previousClass = previousClass;
            if (federalVerificationStatus) {
                student.federalVerificationStatus = federalVerificationStatus;
                student.verifiedBy = req.user._id;
                student.verifiedAt = new Date();
            }
        } else if (studentType === 'Non-Wafaq') {
            // Non-Federal
            if (previousMadrasa !== undefined) student.previousMadrasa = previousMadrasa;
            if (madrasaContact !== undefined) student.madrasaContact = madrasaContact;
            if (req.file) {
                student.certificateUrl = `/uploads/certificates/${req.file.filename}`;
            }
            if (nonFederalReviewStatus) {
                student.nonFederalReviewStatus = nonFederalReviewStatus;
                student.nonFederalReviewedBy = req.user._id;
                student.nonFederalReviewedAt = new Date();
            }
        }

        await student.save();

        const saved = await Student.findById(student._id)
            .populate('verifiedBy', 'name username')
            .populate('nonFederalReviewedBy', 'name username');

        res.json({ success: true, data: saved });
    } catch (error) {
        console.error(error);
        res.status(400).json({ success: false, message: error.message });
    }
});

// @route   GET /api/students/:id
// @desc    Get single student
// @access  Private
router.get('/:id', protect, async (req, res) => {
    try {
        const student = await Student.findById(req.params.id)
            .populate('createdBy', 'name username')
            .populate('verifiedBy', 'name username');

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

router.put('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        )
            .populate('createdBy', 'name username')
            .populate('verifiedBy', 'name username');

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        res.json({
            success: true,
            data: student,
        });
    } catch (error) {
        console.error(error);
        res.status(400).json({
            success: false,
            message: error.message
        });
    }
});

router.delete('/:id', protect, authorize('admin'), async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);

        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'Student not found'
            });
        }

        await student.deleteOne();

        res.json({
            success: true,
            message: 'Student deleted successfully',
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({
            success: false,
            message: 'Server error'
        });
    }
});

export default router;
