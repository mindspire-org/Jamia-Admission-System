import mongoose from 'mongoose';

const tokenSchema = new mongoose.Schema({
    tokenNumber: {
        type: String,
        // unique: true,
    },
    studentName: {
        type: String,
        // required: [true, 'Student name is required'],
    },
    fatherName: {
        type: String,
        // required: [true, 'Father name is required'],
    },
    dateOfBirth: {
        type: String,
    },
    age: {
        type: String,
    },
    currentAddress: {
        type: String,
    },
    permanentAddress: {
        type: String,
    },
    cnic: {
        type: String,
    },
    passportNumber: {
        type: String,
    },
    bformNumber: {
        type: String,
    },
    idType: {
        type: String,
        enum: ['cnic', 'passport', 'bform'],
        default: 'cnic',
    },
    contact: {
        type: String,
        // required: [true, 'Contact number is required'],
    },
    class: {
        type: String,
        // required: [true, 'Class is required'],
    },
    category: {
        type: String,
        enum: ['Wafaq', 'Non-Wafaq'],
        // required: true,
    },
    statusType: {
        type: String,
        enum: ['قدیم', 'جدید'],
        default: 'جدید',
    },
    residency: {
        type: String,
        enum: ['مقیم', 'غیر مقیم'],
    },
    photoUrl: {
        type: String,
    },
    testDate: {
        type: Date,
    },
    resultDate: {
        type: Date,
    },
    status: {
        type: String,
        enum: ['pending', 'verified', 'rejected'],
        default: 'pending',
    },

    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },

    verifiedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
    },
    verifiedAt: Date,

    formData: {
        type: mongoose.Schema.Types.Mixed,
        default: {},
    },
}, {
    timestamps: true,
});

// Generate token number automatically
// Format: YYMMDD-001 (e.g., 250302-001)
// Note: async middleware must not use next() in Mongoose v9
tokenSchema.pre('validate', async function () {
    if (!this.tokenNumber) {
        const date = new Date();
        const yy = String(date.getFullYear()).slice(-2);
        const mm = String(date.getMonth() + 1).padStart(2, '0');
        const dd = String(date.getDate()).padStart(2, '0');
        const dateStr = `${yy}${mm}${dd}`;

        const startOfDay = new Date(date.setHours(0, 0, 0, 0));
        const count = await mongoose.model('Token').countDocuments({
            createdAt: {
                $gte: startOfDay,
            },
        });

        this.tokenNumber = `${dateStr}-${String(count + 1).padStart(3, '0')}`;
    }
});

const Token = mongoose.model('Token', tokenSchema);

export default Token;
