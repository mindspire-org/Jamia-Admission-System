import { useState, useEffect, useCallback, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, Save, QrCode, Loader2, Search, Plus, Trash2, Edit2, Check, X, ExternalLink, Building2, DoorOpen, BedDouble } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { tokensAPI, toAbsoluteAssetUrl } from "@/lib/api";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Hostel {
  _id: string;
  name: string;
  address: string;
  rooms: number;
  capacity: number;
  occupied: number;
  warden: string;
  contact: string;
}

interface Room {
  _id: string;
  roomNumber: string;
  hostelId: string;
  hostelName: string;
  capacity: number;
  occupied: number;
}

interface Bed {
  _id: string;
  bedNumber: string;
  roomNumber: string;
  hostelId: string;
  studentName?: string;
  statusType?: string; // Added to track Qadeem/Jadid
  isOccupied: boolean;
}

interface FormData {
  // Basic info
  name: string;
  fatherName: string;
  dob: string;
  nationality: string;
  currentAddress: string;
  permanentAddress: string;
  phone: string;
  cnic: string;
  passportNumber?: string;
  bformNumber?: string;
  idType: "cnic" | "passport" | "bform";
  statusType: string;
  tokenNumber: string;
  admissionDate: string;
  desiredGrade: string;
  examMarks: string;
  category: string;
  
  // Previous education
  lastGrade: string;
  marks: string;
  grade: string;
  schoolName: string;
  wafaqRollNo: string;
  year: string;
  regNo: string;
  worldlyEducation: string;
  hafizQuran: boolean;
  nonHafiz: boolean;
  
  // Guardian info
  guardianName: string;
  guardianFatherName: string;
  contact1: string;
  contact2: string;
  guardianCnic: string;
  occupation: string;
  relationship: string;
  guardianCurrentAddress: string;
  residency: string;
  photoUrl?: string;
}

const defaultFormData: FormData = {
  name: "",
  fatherName: "",
  dob: "",
  nationality: "",
  currentAddress: "",
  permanentAddress: "",
  phone: "",
  cnic: "",
  passportNumber: "",
  bformNumber: "",
  idType: "cnic",
  statusType: "جدید",
  tokenNumber: "",
  admissionDate: "",
  desiredGrade: "",
  examMarks: "",
  category: "",
  lastGrade: "",
  marks: "",
  grade: "",
  schoolName: "",
  wafaqRollNo: "",
  year: "",
  regNo: "",
  worldlyEducation: "",
  hafizQuran: false,
  nonHafiz: false,
  guardianName: "",
  guardianFatherName: "",
  contact1: "",
  contact2: "",
  guardianCnic: "",
  occupation: "",
  relationship: "",
  guardianCurrentAddress: "",
  residency: "",
  photoUrl: "",
};

export default function Verification() {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [formData, setFormData] = useState<FormData>(defaultFormData);
  const [loading, setLoading] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);

  // Hostel selection states
  const [hostels, setHostels] = useState<Hostel[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [beds, setBeds] = useState<Bed[]>([]);
  const [selectedHostel, setSelectedHostel] = useState<string | undefined>(undefined);
  const [selectedRoom, setSelectedRoom] = useState<string | undefined>(undefined);
  const [selectedBed, setSelectedBed] = useState<string | undefined>(undefined);

  // New logic for hostel visibility
  const [showHostelWarning, setShowHostelWarning] = useState(false);
  const [forceShowHostel, setForceHostelVisible] = useState(false);

  // Load hostels, rooms, beds from localStorage
  useEffect(() => {
    const savedHostels = localStorage.getItem("hostels");
    const savedRooms = localStorage.getItem("rooms");
    const savedBeds = localStorage.getItem("beds");
    
    if (savedHostels) setHostels(JSON.parse(savedHostels));
    if (savedRooms) setRooms(JSON.parse(savedRooms));
    if (savedBeds) setBeds(JSON.parse(savedBeds));
  }, []);

  // Filter available rooms for selected hostel
  const availableRooms = useMemo(() => {
    if (!selectedHostel) return [];
    const hostelRooms = rooms.filter(r => r.hostelId === selectedHostel);
    
    // For Qadeem students, we might want to sort or filter
    if (formData.statusType === "قدیم") {
      const qadeemPerRoom: Record<string, number> = {};
      beds.forEach(b => {
        if (b.isOccupied && b.statusType === "قدیم" && b.hostelId === selectedHostel) {
          qadeemPerRoom[b.roomNumber] = (qadeemPerRoom[b.roomNumber] || 0) + 1;
        }
      });

      // Sort rooms: rooms with fewer Qadeem students first
      return [...hostelRooms].sort((a, b) => {
        const countA = qadeemPerRoom[a.roomNumber] || 0;
        const countB = qadeemPerRoom[b.roomNumber] || 0;
        return countA - countB;
      });
    }
    
    return hostelRooms;
  }, [selectedHostel, rooms, formData.statusType, beds]);

  // Calculate available bed slots for selected room
  const availableBedSlots = useMemo(() => {
    if (!selectedRoom || !selectedHostel) return [];
    const room = rooms.find(r => r.roomNumber === selectedRoom && r.hostelId === selectedHostel);
    if (!room) return [];
    
    const occupiedBeds = beds.filter(b => 
      b.roomNumber === selectedRoom && 
      b.hostelId === selectedHostel && 
      b.isOccupied
    );
    
    const occupiedBedNumbers = new Set(occupiedBeds.map(b => b.bedNumber));
    const capacity = room.capacity || 5;
    
    const availableSlots = [];
    for (let i = 1; i <= capacity; i++) {
      const bedNum = i.toString();
      if (!occupiedBedNumbers.has(bedNum)) {
        availableSlots.push({
          _id: `virtual-${selectedHostel}-${selectedRoom}-${bedNum}`,
          bedNumber: bedNum,
          roomNumber: selectedRoom,
          hostelId: selectedHostel,
          isOccupied: false
        });
      }
    }
    return availableSlots;
  }, [selectedRoom, selectedHostel, rooms, beds]);

  // Handle hostel selection
  const handleHostelChange = (hostelId: string) => {
    setSelectedHostel(hostelId);
    setSelectedRoom(undefined);
    setSelectedBed(undefined);
    const hostel = hostels.find(h => h._id === hostelId);
    if (hostel) {
      setFormData(prev => ({ ...prev, residency: hostel.name }));
    }
  };

  // Logic to find best room for Qadeem students
  const findBestRoomForQadeem = useCallback(() => {
    if (formData.statusType !== "قدیم") return;

    // 1. Calculate Qadeem count per room
    const qadeemPerRoom: Record<string, number> = {}; // key: hostelId-roomNumber, value: count
    beds.forEach(b => {
      if (b.isOccupied && b.statusType === "قدیم") {
        const key = `${b.hostelId}-${b.roomNumber}`;
        qadeemPerRoom[key] = (qadeemPerRoom[key] || 0) + 1;
      }
    });

    // 2. Find rooms with minimum Qadeem students, but also having capacity
    let bestHostelId: string | undefined;
    let bestRoomNumber: string | undefined;
    let minQadeemCount = Infinity;

    // We want to distribute Qadeem students as 1 per room, then 2, etc.
    // Try to find a room with 0 Qadeem, then 1, then 2...
    for (let currentLimit = 0; currentLimit < 10; currentLimit++) {
      for (const hostel of hostels) {
        const hostelRooms = rooms.filter(r => r.hostelId === hostel._id);
        for (const room of hostelRooms) {
          // Check capacity
          const currentOccupied = beds.filter(b => b.hostelId === hostel._id && b.roomNumber === room.roomNumber && b.isOccupied).length;
          if (currentOccupied < (room.capacity || 5)) {
            const qCount = qadeemPerRoom[`${hostel._id}-${room.roomNumber}`] || 0;
            if (qCount === currentLimit) {
              bestHostelId = hostel._id;
              bestRoomNumber = room.roomNumber;
              break;
            }
          }
        }
        if (bestHostelId) break;
      }
      if (bestHostelId) break;
    }

    if (bestHostelId && bestRoomNumber) {
      setSelectedHostel(bestHostelId);
      setSelectedRoom(bestRoomNumber);
      setSelectedBed(undefined);
      const hostel = hostels.find(h => h._id === bestHostelId);
      if (hostel) {
        setFormData(prev => ({ ...prev, residency: `${hostel.name} - کمرہ: ${bestRoomNumber}` }));
        toast.info(`قدیم طالب علم کے لیے بہترین جگہ (${hostel.name}، کمرہ ${bestRoomNumber}) خودکار طور پر منتخب کر لی گئی ہے`);
      }
    }
  }, [formData.statusType, hostels, rooms, beds, formData.name]);

  // Trigger auto-allocation for Qadeem students when form is shown or status changes
  useEffect(() => {
    if (showForm && formData.statusType === "قدیم" && !selectedHostel) {
      findBestRoomForQadeem();
    }
  }, [showForm, formData.statusType, findBestRoomForQadeem, selectedHostel]);

  // Handle room selection
  const handleRoomChange = (roomNumber: string) => {
    setSelectedRoom(roomNumber);
    setSelectedBed(undefined);
    const hostel = hostels.find(h => h._id === selectedHostel);
    if (hostel) {
      setFormData(prev => ({ ...prev, residency: `${hostel.name} - کمرہ: ${roomNumber}` }));
    }
  };

  // Handle bed selection
  const handleBedSelect = (bedNumber: string) => {
    setSelectedBed(bedNumber);
    const hostel = hostels.find(h => h._id === selectedHostel);
    if (hostel && selectedRoom) {
      setFormData(prev => ({ 
        ...prev, 
        residency: `${hostel.name} - کمرہ: ${selectedRoom} - بستر: ${bedNumber}` 
      }));
    }
  };

  // Dynamic Education Options
  const [eduOptions, setEduOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem("jamia_edu_options");
    return saved ? JSON.parse(saved) : ["Middle", "Matric", "Inter", "Bachelor", "Master"];
  });
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editingValue, setEditingValue] = useState("");
  const [newEduValue, setNewEduValue] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);

  // Dynamic Relation Options
  const [relOptions, setRelOptions] = useState<string[]>(() => {
    const saved = localStorage.getItem("jamia_rel_options");
    return saved ? JSON.parse(saved) : ["والد", "چچا", "تایا", "بھائی", "دادا"];
  });
  const [editingRelIndex, setEditingRelIndex] = useState<number | null>(null);
  const [editingRelValue, setEditingRelValue] = useState("");
  const [newRelValue, setNewRelValue] = useState("");
  const [isAddingNewRel, setIsAddingNewRel] = useState(false);

  useEffect(() => {
    localStorage.setItem("jamia_edu_options", JSON.stringify(eduOptions));
  }, [eduOptions]);

  useEffect(() => {
    localStorage.setItem("jamia_rel_options", JSON.stringify(relOptions));
  }, [relOptions]);

  const addEduOption = () => {
    if (newEduValue.trim() && !eduOptions.includes(newEduValue.trim())) {
      setEduOptions([...eduOptions, newEduValue.trim()]);
      setNewEduValue("");
      setIsAddingNew(false);
      toast.success("نئی تعلیم شامل کر دی گئی");
    }
  };

  const deleteEduOption = (index: number) => {
    const newOptions = eduOptions.filter((_, i) => i !== index);
    setEduOptions(newOptions);
    toast.success("تعلیم حذف کر دی گئی");
  };

  const startEditing = (index: number, value: string) => {
    setEditingIndex(index);
    setEditingValue(value);
  };

  const saveEdit = (index: number) => {
    if (editingValue.trim()) {
      const newOptions = [...eduOptions];
      newOptions[index] = editingValue.trim();
      setEduOptions(newOptions);
      setEditingIndex(null);
      toast.success("تبدیلی محفوظ کر لی گئی");
    }
  };

  const addRelOption = () => {
    if (newRelValue.trim() && !relOptions.includes(newRelValue.trim())) {
      setRelOptions([...relOptions, newRelValue.trim()]);
      setNewRelValue("");
      setIsAddingNewRel(false);
      toast.success("نیا رشتہ شامل کر دیا گیا");
    }
  };

  const deleteRelOption = (index: number) => {
    const newOptions = relOptions.filter((_, i) => i !== index);
    setRelOptions(newOptions);
    toast.success("رشتہ حذف کر دیا گیا");
  };

  const startEditingRel = (index: number, value: string) => {
    setEditingRelIndex(index);
    setEditingRelValue(value);
  };

  const saveEditRel = (index: number) => {
    if (editingRelValue.trim()) {
      const newOptions = [...relOptions];
      newOptions[index] = editingRelValue.trim();
      setRelOptions(newOptions);
      setEditingRelIndex(null);
      toast.success("تبدیلی محفوظ کر لی گئی");
    }
  };

  // Auto-fetch data when search query changes (with debounce)
  useEffect(() => {
    if (!searchQuery.trim()) return;
    
    const timer = setTimeout(() => {
      fetchStudentData(searchQuery);
    }, 500); // 500ms debounce
    
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const fetchStudentData = useCallback(async (token: string) => {
    setLoading(true);
    
    try {
      // 1. Try to fetch from API first (Central Database)
      const response = await tokensAPI.getByToken(token);
      const apiToken = response.data.data;
      
      if (apiToken) {
        console.log("Token found via API:", apiToken);
        const populatedData: FormData = {
          ...defaultFormData,
          tokenNumber: apiToken.tokenNumber || token,
          name: apiToken.studentName || "",
          fatherName: apiToken.fatherName || "",
          dob: apiToken.dateOfBirth || "",
          cnic: apiToken.cnic || "",
          passportNumber: apiToken.passportNumber || "",
          bformNumber: apiToken.bformNumber || "",
          idType: apiToken.idType || "cnic",
          statusType: apiToken.statusType || "جدید",
          phone: apiToken.contact || "",
          currentAddress: apiToken.currentAddress || "",
          permanentAddress: apiToken.permanentAddress || "",
          desiredGrade: apiToken.class || "",
          guardianName: apiToken.studentName || "", // Fallback
          contact1: apiToken.contact || "",
          category: apiToken.category || "",
          residency: apiToken.residency || "",
          photoUrl: apiToken.photoUrl ? toAbsoluteAssetUrl(apiToken.photoUrl) : "",
          nationality: apiToken.idType === "passport" ? "غیر ملکی" : "ملکی",
          // Load form data if it exists in DB
          ...(apiToken.formData || {}),
        };
        
        setFormData(populatedData);
        setStudentId(apiToken._id);
        toast.success(`ٹوکن ${token} کی تفصیلات ڈیٹا بیس سے لوڈ ہو گئیں`);
        setShowForm(true);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.error("API Error fetching token:", error);
      // Continue to localStorage fallback if API fails
    }

    // 2. Try to load from admission form localStorage fallback (Local system only)
    const savedFormData = localStorage.getItem(`admissionForm_${token}`);
    if (savedFormData) {
      const parsed = JSON.parse(savedFormData);
      setFormData({ ...defaultFormData, ...parsed, tokenNumber: token });
      toast.success("فارم کی تفصیلات (لوکل اسٹوریج) سے لوڈ ہو گئیں");
      setShowForm(true);
      setLoading(false);
      return;
    }
    
    // 3. Try to load from token-management local storage (Local system only)
    const possibleKeys = ["jamia_tokens_v1", "tokens", "tokenManagement", "jamia_tokens"];
    let foundToken = null;
    
    for (const key of possibleKeys) {
      const tokenStorageData = localStorage.getItem(key);
      if (tokenStorageData) {
        try {
          const tokens = JSON.parse(tokenStorageData);
          if (Array.isArray(tokens)) {
            const matchingToken = tokens.find((t: any) => 
              t.tokenNumber === token || 
              t.tokenNumber?.toString() === token ||
              t.id === token
            );
            if (matchingToken) {
              foundToken = matchingToken;
              break;
            }
          }
        } catch (e) {}
      }
    }
    
    if (foundToken) {
      const populatedData: FormData = {
        ...defaultFormData,
        tokenNumber: foundToken.tokenNumber || token,
        name: foundToken.studentName || "",
        fatherName: foundToken.fatherName || "",
        dob: foundToken.dateOfBirth || "",
        cnic: foundToken.cnic || "",
        passportNumber: foundToken.passportNumber || "",
        bformNumber: foundToken.bformNumber || "",
        idType: foundToken.idType || "cnic",
        statusType: foundToken.statusType || "جدید",
        phone: foundToken.contact || "",
        currentAddress: foundToken.currentAddress || "",
        permanentAddress: foundToken.permanentAddress || "",
        desiredGrade: foundToken.class || "",
        guardianName: foundToken.studentName || "",
        contact1: foundToken.contact || "",
        category: foundToken.category || "",
        residency: foundToken.residency || "",
        photoUrl: foundToken.photoUrl || "",
        nationality: foundToken.idType === "passport" ? "غیر ملکی" : "ملکی",
      };
      
      setFormData(populatedData);
      toast.success(`ٹوکن ${token} کی تفصیلات (لوکل) لوڈ ہو گئیں`);
      setShowForm(true);
      setLoading(false);
      return;
    }
    
    // 4. If no data found anywhere, show empty form
    setFormData({ ...defaultFormData, tokenNumber: token });
    toast.info("ٹوکن ڈیٹا بیس میں نہیں ملا - براہ کرم تفصیلات درج کریں");
    setShowForm(true);
    setLoading(false);
  }, []);

  const handleQRScan = () => {
    // For now, simulate QR scan with a prompt
    const token = prompt("QR کوڈ اسکین کرنے کے لیے ٹوکن نمبر درج کریں:");
    if (token) {
      setSearchQuery(token);
      const savedData = localStorage.getItem(`admissionForm_${token}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setFormData({ ...defaultFormData, ...parsed, tokenNumber: token });
        toast.success("فارم کی تفصیلات لوڈ ہو گئیں");
      } else {
        setFormData({ ...defaultFormData, tokenNumber: token });
        toast.info("نیا فارم - براہ کرم تفصیلات درج کریں");
      }
      setShowForm(true);
    }
  };

  const handleBackToSearch = () => {
    setShowForm(false);
    setSearchQuery("");
    setFormData(defaultFormData);
    setStudentId(null);
  };

  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePrint = () => {
    window.print();
  };

  // Logic for hostel block visibility
  const shouldHideHostelBlock = formData.statusType === "جدید" && formData.category === "Non-Wafaq";
  const shouldWarnHostelBlock = formData.statusType === "قدیم" && formData.category === "Non-Wafaq";

  const handleHostelBlockClick = () => {
    if (shouldWarnHostelBlock && !forceShowHostel) {
      setShowHostelWarning(true);
    }
  };

  const handleSave = async () => {
    // Save to localStorage with token number as key (Fallback)
    const key = formData.tokenNumber || `admission_${Date.now()}`;
    localStorage.setItem(`admissionForm_${key}`, JSON.stringify(formData));

    // Save to Central Database if studentId is available
    if (studentId) {
      try {
        await tokensAPI.saveFormData(studentId, formData);
        toast.success("ڈیٹا بیس میں فارم محفوظ ہو گیا");
      } catch (error) {
        console.error("Failed to save to database:", error);
        toast.error("ڈیٹا بیس میں محفوظ نہیں ہو سکا (صرف لوکل محفوظ ہوا)");
      }
    }

    // Logic to save hostel allocation to the central 'beds' and update 'hostels'
    if (selectedHostel && selectedRoom && selectedBed) {
      const savedBeds = localStorage.getItem("beds");
      const currentBeds = savedBeds ? JSON.parse(savedBeds) : [];
      
      const hostel = hostels.find(h => h._id === selectedHostel);
      
      // Check if this student already has an allocation to avoid duplicates
      const existingBedIndex = currentBeds.findIndex((b: any) => b.studentName === formData.name && b.hostelId === selectedHostel);
      
      const newBedAllocation = {
        _id: `bed-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        studentName: formData.name,
        statusType: formData.statusType, // Save student status
        hostelId: selectedHostel,
        hostelName: hostel?.name || "",
        roomNumber: selectedRoom,
        bedNumber: selectedBed,
        guardianDate: new Date().toISOString().split('T')[0], // Default current date
        leaveDate: "", // Can be updated later
        isOccupied: true
      };

      let updatedBeds;
      if (existingBedIndex >= 0) {
        updatedBeds = [...currentBeds];
        updatedBeds[existingBedIndex] = newBedAllocation;
      } else {
        updatedBeds = [newBedAllocation, ...currentBeds];
        
        // Update occupied counts in hostels
        const savedHostels = localStorage.getItem("hostels");
        if (savedHostels) {
          const hostelsList = JSON.parse(savedHostels);
          const updatedHostels = hostelsList.map((h: any) =>
            h._id === selectedHostel 
              ? { ...h, occupied: (h.occupied || 0) + 1 } 
              : h
          );
          localStorage.setItem("hostels", JSON.stringify(updatedHostels));
          setHostels(updatedHostels);
        }

        // Update occupied counts in rooms
        const savedRooms = localStorage.getItem("rooms");
        if (savedRooms) {
          const roomsList = JSON.parse(savedRooms);
          const updatedRooms = roomsList.map((r: any) =>
            (r.hostelId === selectedHostel && r.roomNumber === selectedRoom)
              ? { ...r, occupied: (r.occupied || 0) + 1 }
              : r
          );
          localStorage.setItem("rooms", JSON.stringify(updatedRooms));
          setRooms(updatedRooms);
        }
      }

      localStorage.setItem("beds", JSON.stringify(updatedBeds));
      setBeds(updatedBeds);
      
      // Notify all components (Dashboard, Residents, etc.)
      window.dispatchEvent(new CustomEvent("hostelsUpdated"));
    }

    toast.success("فارم کی تفصیلات اور ہاسٹل الاٹمنٹ محفوظ ہو گئیں");
  };

  // Load saved data on mount if URL has token param
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get("token");
    if (token) {
      setSearchQuery(token);
      const savedData = localStorage.getItem(`admissionForm_${token}`);
      if (savedData) {
        const parsed = JSON.parse(savedData);
        setFormData({ ...defaultFormData, ...parsed, tokenNumber: token });
        setShowForm(true);
      }
    }
  }, []);

  // Search Interface
  if (!showForm) {
    return (
      <DashboardLayout title="تصدیق">
        <PageHeader
          title="ورڈ خواستوں کی تصدیق"
          description="ٹوکن نمبر یا رول نمبر سے طالب علم کی تفصیلات تلاش کریں اوردرخواستوں کی منظوری مسترد کریں"
        />

        <div className="max-w-4xl mx-auto mt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Token Search Section */}
            <div className="bg-white rounded-lg border p-6 text-center">
              <h3 className="text-lg font-semibold mb-4">ٹوکن تلاش کریں</h3>
              <div className="relative">
                {loading ? (
                  <Loader2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 animate-spin" />
                ) : null}
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ٹوکن نمبر لکھیں..."
                  className="text-right"
                  disabled={loading}
                />
              </div>
              <p className="text-sm text-gray-500 mt-2">
                نمبر لکھتے ہی خودبخود تلاش ہو جائے گا
              </p>
            </div>

            {/* QR Code Section */}
            <div className="bg-white rounded-lg border p-6 text-center">
              <h3 className="text-lg font-semibold mb-4">QR کوڈ اسکین کریں</h3>
              <Button 
                onClick={handleQRScan}
                className="w-full bg-orange-600 hover:bg-orange-700 h-12 text-base"
              >
                <QrCode className="h-5 w-5 ml-2" />
                QR کوڈ اسکین کریں
              </Button>
            </div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  // Form View
  return (
    <DashboardLayout title="داخلہ فارم">
      <PageHeader
        title="داخلہ فارم"
        description=""
      />

      {/* Back Button */}
      <div className="mb-4 print:hidden">
        <Button variant="outline" onClick={handleBackToSearch}>
          ← واپس تلاش کریں
        </Button>
      </div>

      <div className="admission-form-container">
        <link 
          href="https://fonts.googleapis.com/css2?family=Noto+Nastaliq+Urdu:wght@400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        
        <div className="form-page">
          {/* HEADER */}
          <div className="form-header">
            <div className="logo-section">
              <img src="/logo.png" alt="Logo" className="logo-img" />
            </div>
            <div className="header-center">
              <div className="header-title">جَامِعَةُ اِسلَامِیَہ دَارُ العُلُومِ سَرْحَد <span className="header-city">(پشاور)</span></div>
              <div className="header-subtitle">ملحق وفاق المدارس العربیہ پاکستان</div>
            </div>
          </div>

          {/* TOP INFO ROW - BOXED with Title and Photo */}
          <div className="top-info-box">
            <div className="top-info-header">
              <div className="top-info-title">داخلہ فارم ({formData.statusType || "قدیم"})</div>
              <div className="top-info-date">
                <span className="info-label">تاریخ داخلہ:</span>
                <input 
                  type="text" 
                  className="info-line-input"
                  value={formData.admissionDate}
                  onChange={(e) => handleInputChange("admissionDate", e.target.value)}
                />
              </div>
            </div>
            <div className="top-info-body">
              <div className="top-info-left">
                <div className="top-info-row grade-row">
                  <span className="info-label grade-label">مطلوبہ درجہ:</span>
                  <input 
                    type="text" 
                    className="info-line-input grade-input"
                    value={formData.desiredGrade}
                    onChange={(e) => handleInputChange("desiredGrade", e.target.value)}
                  />
                </div>
                <div className="top-info-spacer"></div>
                <div className="top-info-row tokens-row bottom-row">
                  <div className="info-item compact token-left">
                    <span className="info-label">ٹوکن نمبر:</span>
                    <input 
                      type="text" 
                      className="info-box-input tiny"
                      value={formData.tokenNumber}
                      onChange={(e) => handleInputChange("tokenNumber", e.target.value)}
                    />
                  </div>
                  {formData.statusType === 'جدید' && (
                    <div className="info-item compact marks-right">
                      <span className="info-label">داخلہ امتحان میں حاصل کردہ نمبرات:</span>
                      <input 
                        type="text" 
                        className="info-box-input micro"
                        value={formData.examMarks}
                        onChange={(e) => handleInputChange("examMarks", e.target.value)}
                      />
                    </div>
                  )}
                </div>
              </div>
              <div className="photo-box-large">
                {formData.photoUrl ? (
                  <img src={formData.photoUrl} alt="Student" className="photo-img-full" />
                ) : (
                  "تصویر"
                )}
              </div>
            </div>
          </div>

          {/* SECTION 1: کوائف نامہ */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-title">کوائف نامہ</div>
            </div>
            <div className="section-box">
              <div className="form-row compact-row">
                <div className="field field-auto">
                  <label>نام:</label>
                  <input 
                    type="text" 
                    className="field-input short"
                    value={formData.name}
                    onChange={(e) => handleInputChange("name", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>ولدیت:</label>
                  <input 
                    type="text" 
                    className="field-input short"
                    value={formData.fatherName}
                    onChange={(e) => handleInputChange("fatherName", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>پیدائش کی تاریخ:</label>
                  <input 
                    type="text" 
                    className="field-input medium"
                    value={formData.dob}
                    onChange={(e) => handleInputChange("dob", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>قومیت:</label>
                  <input 
                    type="text" 
                    className="field-input short"
                    value={formData.nationality}
                    onChange={(e) => handleInputChange("nationality", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="field field-grow">
                  <label>موجودہ پتہ:</label>
                  <input 
                    type="text" 
                    className="field-input"
                    value={formData.currentAddress}
                    onChange={(e) => handleInputChange("currentAddress", e.target.value)}
                  />
                </div>
                <div className="field field-grow">
                  <label>مستقل پتہ:</label>
                  <input 
                    type="text" 
                    className="field-input"
                    value={formData.permanentAddress}
                    onChange={(e) => handleInputChange("permanentAddress", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row compact-row">
                <div className="field field-auto">
                  <label>فون نمبر:</label>
                  <input 
                    type="text" 
                    className="field-input medium"
                    value={formData.phone}
                    onChange={(e) => handleInputChange("phone", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>{formData.idType === 'passport' ? 'پاسپورٹ نمبر:' : formData.idType === 'bform' ? 'بی فارم نمبر:' : 'شناختی کارڈ نمبر:'}</label>
                  <div className="cnic-row" dir="ltr">
                    {(formData.idType === 'passport' ? formData.passportNumber || '' : formData.idType === 'bform' ? formData.bformNumber || '' : formData.cnic).split("").map((char, i) => (
                      <div key={i} className="cnic-box">{char}</div>
                    ))}
                    {formData.idType !== 'passport' && Array.from({ length: 15 - (formData.idType === 'bform' ? (formData.bformNumber || '').length : formData.cnic.length) }).map((_, i) => (
                      <div key={`empty-${i}`} className="cnic-box"></div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 2: سابقہ کارکردگی */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-title">سابقہ کارکردگی</div>
            </div>
            <div className="section-box compact-section">
              <div className="form-row compact-row">
                <div className="field field-auto">
                  <label>{formData.category === 'Wafaq' ? 'وفاق کا آخری پاس کردہ درجہ:' : 'درسِ نظامی کا آخری پاس کردہ درجہ:'}</label>
                  <input 
                    type="text" 
                    className="field-input xs"
                    value={formData.lastGrade}
                    onChange={(e) => handleInputChange("lastGrade", e.target.value)}
                  />
                </div>
                <div className="field field-auto line-field">
                  <label>حاصل کردہ نمبرات:</label>
                  <input 
                    type="text" 
                    className="info-line wide"
                    value={formData.marks}
                    onChange={(e) => handleInputChange("marks", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>تقدیر:</label>
                  <input 
                    type="text" 
                    className="field-input wide"
                    value={formData.grade}
                    onChange={(e) => handleInputChange("grade", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row">
                <div className="field field-grow">
                  <label>نام مدرسہ/جامعہ مع مکمل پتہ:</label>
                  <input 
                    type="text" 
                    className="field-input"
                    value={formData.schoolName}
                    onChange={(e) => handleInputChange("schoolName", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row compact-row">
                <div className="field field-auto">
                  <label>وفاق رقم الجلوس:</label>
                  <input 
                    type="text" 
                    className="field-input short"
                    value={formData.wafaqRollNo}
                    onChange={(e) => handleInputChange("wafaqRollNo", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>سال:</label>
                  <input 
                    type="text" 
                    className="field-input short"
                    value={formData.year}
                    onChange={(e) => handleInputChange("year", e.target.value)}
                  />
                </div>
                <div className="field field-auto reg-field">
                  <label>رقم التسجيل:</label>
                  <div className="reg-row" dir="ltr">
                    {formData.regNo.split("").map((char, i) => (
                      <div key={i} className="digit-box">{char}</div>
                    ))}
                    {Array.from({ length: 12 - formData.regNo.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="digit-box"></div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="form-row compact-row items-center">
                <div className="field field-grow">
                  <label>عصری تعلیم:</label>
                  <div className="flex items-center gap-2 flex-1 relative">
                    <input 
                      type="text" 
                      className="field-input flex-1"
                      value={formData.worldlyEducation}
                      onChange={(e) => handleInputChange("worldlyEducation", e.target.value)}
                    />
                    <div className="print:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                            منتخب کریں
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-white border shadow-lg z-[100]">
                          {eduOptions.map((opt, idx) => (
                            <div key={idx} className="flex items-center justify-between p-1 hover:bg-gray-100">
                              {editingIndex === idx ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <Input 
                                    value={editingValue} 
                                    onChange={(e) => setEditingValue(e.target.value)}
                                    className="h-7 text-xs"
                                    autoFocus
                                  />
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); saveEdit(idx); }}>
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingIndex(null); }}>
                                    <X className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <DropdownMenuItem 
                                    className="flex-1 cursor-pointer text-right"
                                    onClick={() => handleInputChange("worldlyEducation", opt)}
                                  >
                                    {opt}
                                  </DropdownMenuItem>
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); startEditing(idx, opt); }}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); deleteEduOption(idx); }}>
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          <div className="border-t p-2">
                            {isAddingNew ? (
                              <div className="flex items-center gap-1">
                                <Input 
                                  placeholder="نئی تعلیم..." 
                                  value={newEduValue}
                                  onChange={(e) => setNewEduValue(e.target.value)}
                                  className="h-8 text-xs"
                                  autoFocus
                                />
                                <Button size="icon" className="h-7 w-7" onClick={addEduOption}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAddingNew(false)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="ghost" 
                                className="w-full h-8 text-xs flex items-center gap-1 justify-center border-dashed border"
                                onClick={() => setIsAddingNew(true)}
                              >
                                <Plus className="h-3 w-3" />
                                نئی آپشن شامل کریں
                              </Button>
                            )}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>

                {/* Moved Button here for better layout */}
                {formData.category === 'Wafaq' && (
                  <div className="print:hidden mx-2">
                    <Button
                      variant="default"
                      size="sm"
                      className="gap-2 h-8 text-xs bg-orange-600 hover:bg-orange-700 text-white border-none shadow-sm"
                      onClick={() => window.open("https://www.wifaqulmadaris.org/Results/Infradi", "_blank", "noopener")}
                    >
                      <ExternalLink className="h-3.5 w-3.5 text-white" />
                      وفاقی ویب سائٹ چیک کریں
                    </Button>
                  </div>
                )}

                <div className="field field-auto checkbox-field education-checkbox">
                  <label>اضافی تعلیم:</label>
                  <div className="checkbox-group stacked-checkboxes">
                    <div 
                      className={`checkbox-item ${formData.hafizQuran ? "checked" : ""}`}
                      onClick={() => handleInputChange("hafizQuran", !formData.hafizQuran)}
                    >
                      <div className="checkbox-box">{formData.hafizQuran && "✓"}</div>
                      <span>حافظ قرآن</span>
                    </div>
                    <div 
                      className={`checkbox-item ${formData.nonHafiz ? "checked" : ""}`}
                      onClick={() => handleInputChange("nonHafiz", !formData.nonHafiz)}
                    >
                      <div className="checkbox-box">{formData.nonHafiz && "✓"}</div>
                      <span>غیر حافظ قرآن</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 3: کوائف نامہ برائے سرپرست */}
          <div className="form-section">
            <div className="section-header">
              <div className="section-title">کوائف نامہ برائے سرپرست</div>
            </div>
            <div className="section-box compact-section">
              <div className="form-row compact-row">
                <div className="field field-grow">
                  <label>نام:</label>
                  <input 
                    type="text" 
                    className="field-input"
                    value={formData.guardianName}
                    onChange={(e) => handleInputChange("guardianName", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>ولدیت:</label>
                  <input 
                    type="text" 
                    className="field-input short"
                    value={formData.guardianFatherName}
                    onChange={(e) => handleInputChange("guardianFatherName", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>رابطہ نمبر 1:</label>
                  <input 
                    type="text" 
                    className="field-input medium"
                    value={formData.contact1}
                    onChange={(e) => handleInputChange("contact1", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row compact-row">
                <div className="field field-grow">
                  <label>موجودہ پتہ:</label>
                  <input 
                    type="text" 
                    className="field-input"
                    value={formData.guardianCurrentAddress}
                    onChange={(e) => handleInputChange("guardianCurrentAddress", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>رابطہ نمبر 2:</label>
                  <input 
                    type="text" 
                    className="field-input medium"
                    value={formData.contact2}
                    onChange={(e) => handleInputChange("contact2", e.target.value)}
                  />
                </div>
              </div>
              <div className="form-row compact-row">
                <div className="field field-auto">
                  <label>شناختی کارڈ:</label>
                  <div className="cnic-row" dir="ltr">
                    {formData.guardianCnic.split("").map((char, i) => (
                      <div key={i} className="cnic-box">{char}</div>
                    ))}
                    {Array.from({ length: 15 - formData.guardianCnic.length }).map((_, i) => (
                      <div key={`empty-${i}`} className="cnic-box"></div>
                    ))}
                  </div>
                </div>
                <div className="field field-auto">
                  <label>پیشہ:</label>
                  <input 
                    type="text" 
                    className="field-input short"
                    value={formData.occupation}
                    onChange={(e) => handleInputChange("occupation", e.target.value)}
                  />
                </div>
                <div className="field field-auto">
                  <label>سرپرست سے رشتہ:</label>
                  <div className="flex items-center gap-2 flex-1 relative">
                    <input 
                      type="text" 
                      className="field-input short"
                      value={formData.relationship}
                      onChange={(e) => handleInputChange("relationship", e.target.value)}
                    />
                    <div className="print:hidden">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-6 px-2 text-xs">
                            منتخب کریں
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 bg-white border shadow-lg z-[100]">
                          {relOptions.map((opt, idx) => (
                            <div key={idx} className="flex items-center justify-between p-1 hover:bg-gray-100">
                              {editingRelIndex === idx ? (
                                <div className="flex items-center gap-1 flex-1">
                                  <Input 
                                    value={editingRelValue} 
                                    onChange={(e) => setEditingRelValue(e.target.value)}
                                    className="h-7 text-xs"
                                    autoFocus
                                  />
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); saveEditRel(idx); }}>
                                    <Check className="h-3 w-3 text-green-600" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); setEditingRelIndex(null); }}>
                                    <X className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <DropdownMenuItem 
                                    className="flex-1 cursor-pointer text-right"
                                    onClick={() => handleInputChange("relationship", opt)}
                                  >
                                    {opt}
                                  </DropdownMenuItem>
                                  <div className="flex gap-1">
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); startEditingRel(idx, opt); }}>
                                      <Edit2 className="h-3 w-3" />
                                    </Button>
                                    <Button size="icon" variant="ghost" className="h-6 w-6" onClick={(e) => { e.stopPropagation(); deleteRelOption(idx); }}>
                                      <Trash2 className="h-3 w-3 text-red-500" />
                                    </Button>
                                  </div>
                                </>
                              )}
                            </div>
                          ))}
                          <div className="border-t p-2">
                            {isAddingNewRel ? (
                              <div className="flex items-center gap-1">
                                <Input 
                                  placeholder="نیا رشتہ..." 
                                  value={newRelValue}
                                  onChange={(e) => setNewRelValue(e.target.value)}
                                  className="h-8 text-xs"
                                  autoFocus
                                />
                                <Button size="icon" className="h-7 w-7" onClick={addRelOption}>
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setIsAddingNewRel(false)}>
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ) : (
                              <Button 
                                variant="ghost" 
                                className="w-full h-8 text-xs flex items-center gap-1 justify-center border-dashed border"
                                onClick={() => setIsAddingNewRel(true)}
                              >
                                <Plus className="h-3 w-3" />
                                نیا رشتہ شامل کریں
                              </Button>
                            )}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SECTION 4: دفتری کاروائی */}
          <div className="form-section mt-1 print:mt-0">
            <div className="section-header">
              <div className="section-title">دفتری کاروائی</div>
            </div>
            <div className="section-box">
              <div className="signatures-inline">
                <div className="signature-item seal-signature qr-signature">
                  <div className="qr-row">
                    <div className="signature-line"></div>
                    <div className="signature-label">دستخط ناظم</div>
                  </div>
                </div>

                <div className="signature-item seal-signature qr-signature">
                  <div className="qr-row">
                    <div className="signature-line"></div>
                    <div className="signature-label">دستخط مہتمم / نائب مہتمم</div>
                  </div>
                </div>

                <div className="signature-item seal-signature qr-signature">
                  <div className="qr-row">
                    <div className="signature-line"></div>
                    <div className="signature-label">مہر جامعہ</div>
                  </div>
                </div>
              </div>

              {/* Residency and QR Code in one row below signatures */}
              <div className="flex flex-row items-center justify-between px-2 mt-1 mb-1" dir="rtl">
                {!shouldHideHostelBlock ? (
                  <div className="field flex-1 max-w-[70%]">
                    <label className="font-bold whitespace-nowrap">مقیم:</label>
                    <input 
                      type="text" 
                      className="field-input flex-1"
                      value={formData.residency}
                      onChange={(e) => handleInputChange("residency", e.target.value)}
                      placeholder="ہاسٹل / بیرونی..."
                      disabled={shouldWarnHostelBlock && !forceShowHostel}
                    />
                  </div>
                ) : (
                  <div className="flex-1"></div>
                )}
                {formData.tokenNumber && (
                  <div className="qr-code-office mr-auto ml-4">
                    <QRCodeSVG 
                      value={`${window.location.origin}/slip/${formData.tokenNumber}`} 
                      size={60} 
                      level="H"
                    />
                  </div>
                )}
              </div>

              {/* Hostel Selection UI - Now aligned with residency field above */}
              {!shouldHideHostelBlock && (
                <div 
                  className={`flex justify-start px-2 mt-1 print:hidden relative ${shouldWarnHostelBlock && !forceShowHostel ? 'cursor-pointer' : ''}`} 
                  dir="rtl"
                  onClick={handleHostelBlockClick}
                >
                  {/* Overlay to catch clicks when warning is active */}
                  {shouldWarnHostelBlock && !forceShowHostel && (
                    <div className="absolute inset-0 z-10 bg-transparent"></div>
                  )}
                  
                  <div className={`flex gap-2 items-end ${shouldWarnHostelBlock && !forceShowHostel ? 'opacity-50 grayscale' : ''}`}>
                    {/* Hostel Dropdown */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 mr-1 flex items-center gap-1">
                        <Building2 className="h-3 w-3" /> ہاسٹل
                      </span>
                      <Select 
                        value={selectedHostel} 
                        onValueChange={handleHostelChange}
                        disabled={shouldWarnHostelBlock && !forceShowHostel}
                      >
                        <SelectTrigger className="w-[140px] h-8 text-xs text-right">
                          <SelectValue placeholder="ہاسٹل" />
                        </SelectTrigger>
                        <SelectContent>
                          {hostels.map((h) => (
                            <SelectItem key={h._id} value={h._id} className="text-right">{h.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Room Dropdown */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 mr-1 flex items-center gap-1">
                        <DoorOpen className="h-3 w-3" /> کمرہ
                      </span>
                      <Select 
                        value={selectedRoom} 
                        onValueChange={handleRoomChange}
                        disabled={!selectedHostel || (shouldWarnHostelBlock && !forceShowHostel)}
                      >
                        <SelectTrigger className="w-[90px] h-8 text-xs text-right">
                          <SelectValue placeholder="کمرہ" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRooms.map((r) => (
                            <SelectItem key={r._id} value={r.roomNumber} className="text-right">{r.roomNumber}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Bed Dropdown */}
                    <div className="flex flex-col gap-1">
                      <span className="text-[10px] text-gray-500 mr-1 flex items-center gap-1">
                        <BedDouble className="h-3 w-3" /> بستر
                      </span>
                      <Select 
                        value={selectedBed} 
                        onValueChange={handleBedSelect}
                        disabled={!selectedRoom || (shouldWarnHostelBlock && !forceShowHostel)}
                      >
                        <SelectTrigger className="w-[70px] h-8 text-xs text-right">
                          <SelectValue placeholder="بستر" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableBedSlots.map((b) => (
                            <SelectItem key={b._id} value={b.bedNumber} className="text-right">{b.bedNumber}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Hostel Warning Dialog */}
      <Dialog open={showHostelWarning} onOpenChange={setShowHostelWarning}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle className="text-center text-red-600 text-xl font-bold">توجہ فرمائیں</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center space-y-6 py-4" dir="rtl">
            <div className="bg-red-50 p-4 rounded-lg border border-red-100 w-full">
              <p className="text-center text-gray-800 font-bold text-lg leading-relaxed">
                یہ طالب علم بطور مقیم داخلہ نہیں لے سکتا
              </p>
            </div>
            
            <div className="grid grid-cols-1 gap-3 w-full">
              <Button 
                onClick={() => setShowHostelWarning(false)}
                variant="outline"
                className="w-full h-14 text-base font-bold border-2 hover:bg-gray-50"
              >
                ہم اسے مقیم والا داخلہ نہیں دے رہے
              </Button>
              
              <Button 
                onClick={() => {
                  setForceHostelVisible(true);
                  setShowHostelWarning(false);
                }}
                className="w-full h-14 bg-red-600 hover:bg-red-700 text-white font-bold text-base"
              >
                مقیم داخلہ کی شرط کو نظر انداز کر دیں
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Action Buttons */}
      <div className="flex justify-center gap-4 mt-6 mb-6 print:hidden">
        <Button onClick={handleSave} className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700">
          <Save className="h-4 w-4" />
          محفوظ فارم
        </Button>
        <Button onClick={handlePrint} className="flex items-center gap-2">
          <Printer className="h-4 w-4" />
          پرنٹ کریں
        </Button>
      </div>

      <style>{`
        .admission-form-container {
          font-family: "Noto Nastaliq Urdu", serif;
          direction: rtl;
          background: #f5f5f5;
          padding: 20px;
        }

        .form-page {
          width: 210mm;
          min-height: 297mm;
          max-width: 210mm;
          margin: 0 auto;
          background: white;
          padding: 8mm;
          box-shadow: 0 0 10px rgba(0,0,0,0.1);
          font-size: 11px;
        }

        .form-header {
          display: flex;
          align-items: stretch;
          margin-bottom: 5px;
        }

        .header-center {
          flex: 1;
          text-align: center;
          padding: 5px 10px;
          display: flex;
          flex-direction: column;
          justify-content: center;
        }

        .header-title {
          font-size: 28px;
          font-weight: 600;
          line-height: 1.3;
          margin-bottom: 3px;
        }

        .header-city {
          font-size: 18px;
        }

        .header-subtitle {
          font-size: 11px;
          margin-top: 5px;
          letter-spacing: 2px;
        }

        .logo-section {
          display: flex;
          align-items: center;
          justify-content: center;
          margin-right: 10px;
        }

        .logo-img {
          width: 70px;
          height: 70px;
          object-fit: contain;
          display: block;
        }

        /* Main Title */
        .main-title {
          text-align: center;
          font-size: 18px;
          font-weight: 600;
          margin: 8px 0 10px 0;
          text-decoration: underline;
          text-underline-offset: 3px;
          text-decoration-thickness: 2px;
        }

        /* Top Info Box */
        .top-info-box {
          border: 1px solid #000;
          padding: 0 10px 8px 10px;
          margin-bottom: 12px;
        }

        .top-info-body {
          display: flex;
          gap: 8px;
          align-items: stretch;
          margin-top: 8px;
        }

        .top-info-left {
          flex: 1;
          display: flex;
          flex-direction: column;
          justify-content: space-between;
          min-height: 90px;
        }

        .top-info-spacer {
          flex: 1;
          max-height: 15px;
        }

        .bottom-row {
          margin-top: auto;
        }

        .top-info-row {
          display: flex;
          align-items: baseline;
          gap: 8px;
        }

        .grade-row {
          justify-content: center;
          margin-top: 50px;
        }

        .tokens-row {
          justify-content: space-between;
          align-items: flex-end;
        }

        .token-left {
          align-self: flex-end;
        }

        .marks-right {
          align-self: flex-end;
        }

        .photo-box-large {
          width: 90px;
          height: 120px;
          border: 1.5px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          flex-shrink: 0;
          overflow: hidden;
          background-color: #fff;
        }

        .photo-img-full {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }

        .top-info-title {
          text-align: center;
          font-size: 20px;
          font-weight: 600;
          margin-right: 60px;
          padding: 0 25px;
        }

        .top-info-header {
          display: flex;
          justify-content: center;
          align-items: center;
          margin-bottom: 8px;
          position: relative;
        }

        .top-info-date {
          display: flex;
          align-items: baseline;
          gap: 3px;
          position: absolute;
          right: 0;
        }

        .top-info-inner {
          display: flex;
          flex-direction: column;
          gap: 6px;
        }

        .top-info-row {
          display: flex;
          justify-content: center;
          align-items: flex-end;
          gap: 10px;
        }

        .top-info-bottom-row {
          display: flex;
          justify-content: space-between;
          align-items: flex-end;
        }

        /* Top Info Inputs */
        .info-line-input {
          border: none;
          border-bottom: 1px solid #000;
          min-width: 60px;
          height: 16px;
          font-family: inherit;
          font-size: 11px;
          background: transparent;
          text-align: center;
        }

        .info-line-input.grade-input {
          min-width: 100px;
        }

        .info-box-input {
          border: 1px solid #000;
          min-width: 25px;
          height: 14px;
          font-family: inherit;
          font-size: 10px;
          background: transparent;
          text-align: center;
        }

        .info-box-input.tiny {
          min-width: 22px;
        }

        .info-box-input.micro {
          min-width: 18px;
        }

        /* Top Info */
        .info-item {
          display: flex;
          align-items: baseline;
          gap: 2px;
        }

        .info-item.compact {
          gap: 2px;
        }

        .info-label {
          font-size: 11px;
          white-space: nowrap;
        }

        .grade-label {
          font-size: 20px;
        }

        .grade-row {
          justify-content: center;
          margin-top: 20px;
        }

        .info-line {
          border-bottom: 1px solid #000;
          min-width: 70px;
          height: 18px;
          font-family: inherit;
          font-size: 12px;
          background: transparent;
          text-align: center;
        }

        .info-line.wide {
          min-width: 90px;
        }

        .info-box {
          border: 1px solid #000;
          min-width: 70px;
          height: 22px;
        }

        .info-box.small {
          min-width: 50px;
        }

        .year-box {
          border: 1px solid #000;
          width: 50px;
          height: 20px;
        }

        /* Sections */
        .form-section {
          margin-bottom: 15px;
        }

        .section-header {
          text-align: center;
          margin-bottom: 0;
          position: relative;
          z-index: 2;
        }

        .section-title {
          display: inline-block;
          background: #000;
          color: #fff;
          padding: 2px 20px;
          border-radius: 15px;
          font-size: 13px;
          font-weight: 500;
        }

        .section-box {
          border: 1.5px solid #000;
          padding: 12px 12px 8px 12px;
          margin-top: -10px;
          border-radius: 4px;
        }

        /* Form Rows */
        .form-row {
          display: flex;
          gap: 15px;
          margin-bottom: 10px;
          align-items: baseline;
        }

        .form-row:last-child {
          margin-bottom: 0;
        }

        .compact-row {
          gap: 15px;
          justify-content: space-between;
        }

        .compact-row .field {
          flex: 1;
        }

        .compact-row .field input {
          min-width: 50px;
        }

        /* Fields */
        .field {
          display: flex;
          align-items: baseline;
          gap: 5px;
        }

        .field-grow {
          flex: 1;
        }

        .field-auto {
          flex: 0 0 auto;
        }

        .field-cnic {
          flex: 1;
          justify-content: flex-end;
        }

        .field-fee {
          flex: 1;
          justify-content: flex-end;
        }

        .field-full {
          flex: 1;
          width: 100%;
        }

        .field-full input {
          width: 100%;
        }

        .checkbox-field {
          align-items: center;
        }

        .line-field {
          align-items: baseline;
          gap: 5px;
        }

        .line-field .info-line {
          min-width: 100px;
          height: 16px;
          border-bottom: 1px solid #000;
        }

        .compact-section .line-field .info-line {
          min-width: 80px;
          height: 14px;
        }

        .field label {
          font-size: 11px;
          white-space: nowrap;
        }

        .field-input {
          border: none;
          border-bottom: 1px solid #000;
          flex: 1;
          min-width: 50px;
          height: 16px;
          font-family: inherit;
          font-size: 11px;
          background: transparent;
          padding: 0 3px;
        }

        .field-input.short {
          min-width: 40px;
          max-width: 60px;
        }

        .field-input.xs {
          min-width: 30px;
          max-width: 45px;
        }

        .field-input.wide {
          min-width: 80px;
          max-width: 120px;
        }

        .field-input.medium {
          min-width: 80px;
        }

        /* CNIC */
        .cnic-row {
          display: flex;
          gap: 1px;
          margin-right: 3px;
          align-items: center;
          direction: ltr;
        }

        .cnic-box {
          width: 12px;
          height: 16px;
          border: 1px solid #000;
          text-align: center;
          font-size: 9px;
          line-height: 14px;
        }

        .cnic-dash {
          width: 6px;
          text-align: center;
          line-height: 16px;
          font-size: 10px;
          margin: 0 1px;
        }

        /* Digit Boxes */
        .digit-row {
          display: flex;
          gap: 1px;
          margin-right: 3px;
        }

        .digit-box {
          width: 12px;
          height: 16px;
          border: 1px solid #000;
          text-align: center;
          font-size: 9px;
          line-height: 14px;
        }

        .reg-row {
          display: flex;
          gap: 1px;
          margin-right: 3px;
          align-items: center;
        }

        .reg-slash {
          width: 8px;
          text-align: center;
          line-height: 16px;
          font-size: 10px;
          margin: 0 1px;
        }

        /* Checkboxes */
        .compact-section {
          padding: 10px 12px;
        }

        .compact-section .form-row {
          margin-bottom: 8px;
          gap: 15px;
        }

        .compact-section .form-row:last-child {
          margin-bottom: 0;
        }

        .compact-section .field label {
          font-size: 11px;
        }

        .compact-section .field-input {
          height: 16px;
          font-size: 11px;
        }

        .checkbox-group {
          display: flex;
          align-items: center;
          gap: 10px;
          margin-right: 8px;
        }

        .stacked-checkboxes {
          flex-direction: column;
          gap: 4px;
          align-items: flex-start;
        }

        .stacked-checkboxes .checkbox-item {
          padding: 1px 6px;
          font-size: 11px;
          cursor: pointer;
        }

        .education-checkbox {
          align-items: flex-start;
          gap: 8px;
        }

        .checkbox-item {
          display: flex;
          align-items: center;
          gap: 4px;
          border: 1px solid #000;
          padding: 2px 8px;
          font-size: 12px;
          cursor: pointer;
          user-select: none;
        }

        .checkbox-item.checked {
          background: #f0f0f0;
        }

        .checkbox-box {
          width: 12px;
          height: 12px;
          border: 1px solid #000;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }

        /* Signatures */
        .signatures {
          display: flex;
          justify-content: space-around;
          padding-top: 10px;
        }

        .signatures-inline {
          display: flex;
          flex-direction: row;
          justify-content: space-between;
          align-items: flex-start;
          padding: 10px 8px 3px 8px;
          gap: 15px;
          width: 100%;
          box-sizing: border-box;
        }

        .signatures-inline .signature-item {
          display: flex;
          flex-direction: row;
          align-items: baseline;
          gap: 5px;
          flex: 1;
          min-width: 0;
        }

        .signatures-inline .signature-item.seal-signature {
          flex-direction: row-reverse;
          align-items: center;
        }

        .signatures-inline .signature-item.qr-signature {
          flex-direction: column !important;
          align-items: center;
          gap: 5px;
        }

        .qr-row {
          display: flex;
          flex-direction: row-reverse;
          align-items: baseline;
          gap: 5px;
          width: 100%;
        }

        .qr-code-office {
          display: flex;
          justify-content: center;
          align-items: center;
        }

        .signatures-inline .signature-line {
          flex: 1;
          border-bottom: 1px solid #000;
          height: 14px;
          min-width: 40px;
          max-width: 100%;
          margin-bottom: 0;
          overflow: hidden;
        }

        .signatures-inline .signature-label {
          font-size: 11px;
          white-space: nowrap;
        }

        .signature-item {
          text-align: center;
        }

        .signature-line {
          border-bottom: 1px solid #000;
          width: 100px;
          height: 25px;
          margin-bottom: 3px;
        }

        .signature-label {
          font-size: 13px;
        }

        /* 
           GOLDEN PRINT STANDARDS (DO NOT MODIFY WITHOUT TESTING ON A4)
           - Scale 0.96 ensures fit on all printers without overflow.
           - mt-auto keeps "Office Use" at bottom of A4.
           - 8mm/10mm padding is balanced for A4.
        */
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }

          body {
            margin: 0 !important;
            padding: 0 !important;
            overflow: hidden !important;
          }

          body * {
            visibility: hidden;
          }

          .admission-form-container, .admission-form-container * {
            visibility: visible;
          }

          .admission-form-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            padding: 0 !important;
            margin: 0 !important;
            background: white !important;
            display: block !important;
          }

          .form-page {
            width: 210mm !important;
            min-height: 297mm !important;
            max-width: 210mm !important;
            max-height: 297mm !important;
            padding: 8mm 10mm !important;
            margin: 0 !important;
            box-shadow: none !important;
            overflow: hidden !important;
            display: flex !important;
            flex-direction: column !important;
            box-sizing: border-box !important;
            transform: scale(0.96);
            transform-origin: top center;
          }

          .print\:hidden {
            display: none !important;
          }

          /* Header Section */
          .form-header {
            margin-bottom: 4mm !important;
          }

          .header-title {
            font-size: 20pt !important;
            margin-bottom: 1.5mm !important;
          }

          .header-subtitle {
            font-size: 10.5pt !important;
          }

          .logo-img {
            width: 18mm !important;
            height: 18mm !important;
          }

          /* Top Info Box */
          .top-info-box {
            padding: 3mm 4mm !important;
            margin-bottom: 4mm !important;
            border-width: 1.5pt !important;
          }

          .top-info-title {
            font-size: 17pt !important;
            margin-right: 0 !important;
            padding: 0 4mm !important;
          }

          .grade-label {
            font-size: 15pt !important;
          }

          .grade-row {
            margin-top: 6mm !important;
          }

          .photo-box-large {
            width: 28mm !important;
            height: 38mm !important;
            border-width: 1.5pt !important;
          }

          /* Form Sections */
          .form-section {
            margin-bottom: 4mm !important;
            margin-top: 0 !important;
          }

          .section-title {
            font-size: 10.5pt !important;
            padding: 1.2mm 5mm !important;
            background-color: black !important;
            color: white !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          .section-box {
            border-width: 1.5pt !important;
            padding: 5mm 4mm 4mm 4mm !important;
            margin-top: -3.5mm !important;
          }

          /* Form Rows and Fields */
          .form-row {
            margin-bottom: 3mm !important;
            gap: 4mm !important;
          }

          .field label {
            font-size: 9.5pt !important;
          }

          .field-input, .info-line-input {
            font-size: 9.5pt !important;
            height: 5.5mm !important;
            border-bottom-width: 0.75pt !important;
          }

          /* CNIC and Digit Boxes */
          .cnic-row, .reg-row {
            gap: 0.6mm !important;
            direction: ltr !important;
            display: flex !important;
          }

          .cnic-box, .digit-box {
            width: 3.8mm !important;
            height: 5mm !important;
            border-width: 0.75pt !important;
            font-size: 8.5pt !important;
            line-height: 4.5mm !important;
          }

          /* Checkboxes */
          .checkbox-item {
            padding: 1.2mm 3.5mm !important;
            font-size: 9.5pt !important;
            border-width: 0.75pt !important;
          }

          .checkbox-box {
            width: 3.2mm !important;
            height: 3.2mm !important;
            border-width: 0.75pt !important;
          }

          /* Signatures */
          .signatures-inline {
            padding: 4mm 3mm 0 3mm !important;
            gap: 10mm !important;
          }

          .signature-label {
            font-size: 9.5pt !important;
          }

          .signature-line {
            border-bottom-width: 0.75pt !important;
            height: 18px !important;
          }

          /* Fix for layout spacing */
          .top-info-left {
            min-height: 38mm !important;
          }

          .mt-auto {
            margin-top: auto !important;
          }

          /* Ensure colors print correctly */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }

        /* Responsive */
        @media (max-width: 220mm) {
          .form-page {
            width: 100%;
            padding: 5mm;
          }
        }
      `}</style>
    </DashboardLayout>
  );
}
