import { useEffect, useMemo, useState } from "react";
import { Search, Download } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { studentsAPI, toAbsoluteAssetUrl } from "@/lib/api";

type StudentRow = {
  id: string;
  tokenNumber: string;
  admissionNumber?: string;
  studentName: string;
  fatherName: string;
  class: string;
  status: "pending" | "verified" | "rejected";
  category?: string;
  cnic?: string;
  contact?: string;
  photoUrl?: string;
  previousMadrasa?: string;
  previousClass?: string;
  performance?: string;
  wafaqRollNo?: string;
  notes?: string;
  createdAt?: string;
  verifiedAt?: string;
};

export default function Students() {
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStudent, setSelectedStudent] = useState<StudentRow | null>(null);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<any>(null);
  const [loadingSelectedStudentDetails, setLoadingSelectedStudentDetails] = useState(false);
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [editForm, setEditForm] = useState({
    studentName: "",
    fatherName: "",
    class: "",
    status: "pending" as StudentRow["status"],
    category: "",
    cnic: "",
    contact: "",
  });

  const refresh = async () => {
    try {
      const res = await studentsAPI.getAll();
      const rows = (res.data.data ?? []) as any[];
      setStudents(
        rows.map((s) => ({
          id: s._id,
          tokenNumber: s.tokenNumber,
          admissionNumber: s.admissionNumber,
          studentName: s.studentName,
          fatherName: s.fatherName,
          class: s.class,
          status: s.status,
          category: s.category,
          cnic: s.cnic,
          contact: s.contact,
          photoUrl: toAbsoluteAssetUrl(s.photoUrl || ""),
          previousMadrasa: s.previousMadrasa,
          previousClass: s.previousClass,
          performance: s.performance,
          wafaqRollNo: s.wafaqRollNo,
          notes: s.notes,
          createdAt: s.createdAt,
          verifiedAt: s.verifiedAt,
        }))
      );
    } catch {
      toast.error("طلباء لوڈ نہیں ہو سکے");
    }
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        await refresh();
      } catch {
        toast.error("طلباء لوڈ نہیں ہو سکے");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    const onFocus = () => {
      if (!alive) return;
      refresh();
    };

    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);

    return () => {
      alive = false;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, []);

  const filteredStudents = useMemo(() => {
    const q = searchQuery.trim();
    if (!q) return students;
    return students.filter(
      (student) =>
        student.studentName.includes(q) ||
        student.fatherName.includes(q) ||
        student.tokenNumber.includes(q) ||
        (student.admissionNumber ? student.admissionNumber.includes(q) : false)
    );
  }, [students, searchQuery]);

  const downloadCsv = (filename: string, csvText: string) => {
    const blob = new Blob(["\uFEFF", csvText], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const handleExport = () => {
    if (!filteredStudents.length) {
      toast.message("ایکسپورٹ کے لیے کوئی ریکارڈ موجود نہیں");
      return;
    }

    const headers = [
      "Token",
      "Admission",
      "Name",
      "Father",
      "Class",
      "Status",
      "Category",
      "CNIC",
      "Contact",
      "Wafaq Roll No",
      "Created At",
      "Verified At",
    ];

    const escapeCsv = (value: any) => {
      const s = value === null || value === undefined ? "" : String(value);
      const safe = s.replace(/\r\n|\r|\n/g, " ").trim();
      if (safe.includes(",") || safe.includes("\"") || safe.includes("\n")) {
        return `"${safe.replace(/\"/g, '""')}"`;
      }
      return safe;
    };

    const rows = filteredStudents.map((s) => [
      s.tokenNumber,
      s.admissionNumber ?? "",
      s.studentName,
      s.fatherName,
      s.class,
      s.status,
      s.category ?? "",
      s.cnic ?? "",
      s.contact ?? "",
      s.wafaqRollNo ?? "",
      s.createdAt ?? "",
      s.verifiedAt ?? "",
    ]);

    const csvText = [headers, ...rows]
      .map((r) => r.map(escapeCsv).join(","))
      .join("\n");

    const date = new Date();
    const stamp = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
      date.getDate()
    ).padStart(2, "0")}`;
    downloadCsv(`students-${stamp}.csv`, csvText);
  };

  const openEdit = (student: StudentRow) => {
    setEditing(student);
    setEditForm({
      studentName: student.studentName,
      fatherName: student.fatherName,
      class: student.class,
      status: student.status,
      category: student.category ?? "",
      cnic: student.cnic ?? "",
      contact: student.contact ?? "",
    });
  };

  const closeEdit = () => setEditing(null);

  const saveEdit = async () => {
    if (!editing) return;
    try {
      const res = await studentsAPI.update(editing.id, {
        studentName: editForm.studentName,
        fatherName: editForm.fatherName,
        class: editForm.class,
        status: editForm.status,
        category: editForm.category,
        cnic: editForm.cnic,
        contact: editForm.contact,
      });
      const s = res.data.data;
      setStudents((prev) =>
        prev.map((x) =>
          x.id === editing.id
            ? {
                ...x,
                studentName: s.studentName,
                fatherName: s.fatherName,
                class: s.class,
                status: s.status,
                category: s.category,
                cnic: s.cnic,
                contact: s.contact,
              }
            : x
        )
      );
      toast.success("طالب علم اپ ڈیٹ ہو گیا");
      closeEdit();
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "اپ ڈیٹ نہیں ہو سکا");
    }
  };

  const deleteStudent = async (id: string) => {
    try {
      await studentsAPI.delete(id);
      setStudents((prev) => prev.filter((s) => s.id !== id));
      if (selectedStudent?.id === id) setSelectedStudent(null);
      toast.success("طالب علم حذف ہو گیا");
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "حذف نہیں ہو سکا");
    }
  };

  useEffect(() => {
    if (!selectedStudent?.id) {
      setSelectedStudentDetails(null);
      return;
    }

    let alive = true;
    setLoadingSelectedStudentDetails(true);
    (async () => {
      try {
        const res = await studentsAPI.getById(selectedStudent.id);
        const s = res.data.data;
        const normalized = {
          ...(s && typeof s === "object" ? s : {}),
          _id: s?._id,
          photoUrl: toAbsoluteAssetUrl(s?.photoUrl || ""),
        };
        if (alive) setSelectedStudentDetails(normalized);
      } catch (e: any) {
        if (alive) setSelectedStudentDetails(null);
        toast.error(e?.response?.data?.message || "تفصیل لوڈ نہیں ہو سکی");
      } finally {
        if (alive) setLoadingSelectedStudentDetails(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [selectedStudent?.id]);

  const formFieldLabelsUr: Record<string, string> = {
    fullName: "نام",
    guardianName: "ولدیت",
    studentClass: "مطلوبہ درجہ",
    tokenNumber: "فارم نمبر",
    tokenIssueDate: "تاریخ داخلہ",
    idNumber: "شناختی کارڈ نمبر / ب فارم",
    phone: "رابطہ نمبر",
    currentAddress2: "موجودہ پتہ",
    permanentAddress2: "مستقل پتہ",
    dob2: "تاریخ پیدائش",
    age2: "عمر",
    photoUrl: "تصویر",

    prevMadrasa2: "سابقہ مدرسہ",
    prevClass2: "سابقہ جماعت",
    wafaqRollNo2: "وفاقی رقم الجلوس",
    notes2: "نوٹس",

    cardName: "کارڈ نام",
    cardFather: "کارڈ ولدیت",
    cardClass: "کارڈ جماعت",
    officeCardName: "دفتر کارڈ نام",
    officeCardFather: "دفتر کارڈ ولدیت",
    officeCardClass: "دفتر کارڈ جماعت",

    isLocal: "قومیت (ملکی)",
    isForeign: "قومیت (غیر ملکی)",
    guardianCnic: "سرپرست شناختی کارڈ",
    guardianProfession: "سرپرست پیشہ",
    guardianIsLocal: "سرپرست قومیت (ملکی)",
    guardianIsForeign: "سرپرست قومیت (غیر ملکی)",
    guardianContactSection: "سرپرست رابطہ نمبر",
    guardianNameSection: "سرپرست نام",
    guardianFatherName: "سرپرست ولدیت",
    guardianCurrentAddress: "سرپرست موجودہ پتہ",
    guardianPermanentAddress: "سرپرست مستقل پتہ",
    guardianRelation: "رشتہ",

    officeFormNo: "فارم نمبر (دفتر)",
    officeName: "نام (دفتر)",
    officeClass: "درجہ (دفتر)",
    officeFatherName: "ولدیت (دفتر)",
    officeStatus: "کو بحیثیت (دفتر)",
  };

  const formatLabel = (key: string) => {
    const s = String(key || "");
    const mapped = formFieldLabelsUr[s];
    if (mapped) return mapped;
    return s
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .trim();
  };

  const formatValue = (val: any) => {
    if (val === null || val === undefined) return "-";
    if (typeof val === "boolean") return val ? "ہاں" : "نہیں";
    if (typeof val === "object") {
      try {
        return JSON.stringify(val);
      } catch {
        return String(val);
      }
    }
    const s = String(val);
    return s.trim() ? s : "-";
  };

  return (
    <DashboardLayout title="طلباء">
      <PageHeader
        title="طلباء کی فہرست"
        description="تمام طلباء کی معلومات دیکھیں اور تلاش کریں"
        action={
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 ml-2" />
            ایکسپورٹ
          </Button>
        }
      />

      {/* Search */}
      <Card className="mb-6">
        <CardContent className="pt-6">
          <div className="relative max-w-md">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="نام، والد کا نام، یا رول نمبر سے تلاش کریں..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pr-10 h-12"
            />
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>طلباء ({filteredStudents.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">ٹوکن</TableHead>
                <TableHead className="text-right">نام</TableHead>
                <TableHead className="text-right">والد کا نام</TableHead>
                <TableHead className="text-right">جماعت</TableHead>
                <TableHead className="text-right">تاریخ داخلہ</TableHead>
                <TableHead className="text-right">حیثیت</TableHead>
                <TableHead className="text-right">عمل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow
                    key={student.id}
                    className={
                      selectedStudent?.id === student.id
                        ? "bg-primary/10"
                        : "cursor-pointer hover:bg-muted/50"
                    }
                    onClick={() => setSelectedStudent(student)}
                  >
                    <TableCell className="font-mono font-medium text-primary">
                      {student.tokenNumber}
                    </TableCell>
                    <TableCell className="font-medium">{student.studentName}</TableCell>
                    <TableCell>{student.fatherName}</TableCell>
                    <TableCell>{student.class}</TableCell>
                    <TableCell>
                      {student.createdAt
                        ? new Date(student.createdAt).toLocaleDateString("ur-PK")
                        : "-"}
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={student.status} />
                    </TableCell>

                    <TableCell onClick={(e) => e.stopPropagation()}>
                      <div className="flex gap-2 justify-start">
                        <Button size="sm" variant="outline" onClick={() => openEdit(student)}>
                          ترمیم
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                            >
                              حذف
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>طالب علم حذف کریں؟</AlertDialogTitle>
                              <AlertDialogDescription>
                                یہ ریکارڈ مستقل طور پر حذف ہو جائے گا۔
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>منسوخ</AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => deleteStudent(student.id)}
                                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                              >
                                حذف کریں
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                    کوئی نتیجہ نہیں ملا
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>طالب علم میں ترمیم</DialogTitle>
            <DialogDescription>
              {editing ? `${editing.studentName} / ${editing.tokenNumber}` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نام</Label>
                <Input
                  value={editForm.studentName}
                  onChange={(e) => setEditForm({ ...editForm, studentName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>والد کا نام</Label>
                <Input
                  value={editForm.fatherName}
                  onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>جماعت</Label>
                <Input
                  value={editForm.class}
                  onChange={(e) => setEditForm({ ...editForm, class: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>حیثیت</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v as StudentRow["status"] })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">زیر التوا</SelectItem>
                    <SelectItem value="verified">منظور شدہ</SelectItem>
                    <SelectItem value="rejected">مسترد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>تعلیمی حیثیت</Label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>شناختی کارڈ</Label>
                <Input
                  value={editForm.cnic}
                  onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>رابطہ نمبر</Label>
                <Input
                  value={editForm.contact}
                  onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button className="flex-1" onClick={saveEdit}>
                محفوظ کریں
              </Button>
              <Button className="flex-1" variant="outline" onClick={closeEdit}>
                منسوخ
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!selectedStudent}
        onOpenChange={(open) => {
          if (!open) setSelectedStudent(null);
        }}
      >
        <DialogContent className="sm:max-w-[980px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>طالب علم کی تفصیل</DialogTitle>
            <DialogDescription>
              {selectedStudent
                ? `${selectedStudent.studentName} / ${selectedStudent.tokenNumber}`
                : ""}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent ? (
            <div className="mt-4 space-y-6">
              <div className="flex items-start gap-4">
                <div className="h-24 w-24 rounded-md border bg-muted overflow-hidden shrink-0">
                  {(selectedStudentDetails?.photoUrl || selectedStudent.photoUrl) ? (
                    <img
                      src={selectedStudentDetails?.photoUrl || selectedStudent.photoUrl}
                      alt="student"
                      className="h-full w-full object-cover"
                    />
                  ) : null}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="text-xl font-semibold">
                    {formatValue(selectedStudentDetails?.studentName ?? selectedStudent.studentName)}
                  </div>
                  <div className="text-sm text-muted-foreground">
                    ولدیت: {formatValue(selectedStudentDetails?.fatherName ?? selectedStudent.fatherName)}
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    <Badge variant="secondary">
                      {formatValue(selectedStudentDetails?.class ?? selectedStudent.class)}
                    </Badge>
                    <StatusBadge status={selectedStudentDetails?.status ?? selectedStudent.status} />
                    {selectedStudent.tokenNumber ? (
                      <Badge variant="outline">ٹوکن: {selectedStudent.tokenNumber}</Badge>
                    ) : null}
                    {selectedStudent.admissionNumber ? (
                      <Badge variant="outline">داخلہ: {selectedStudent.admissionNumber}</Badge>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="border rounded-lg p-4 space-y-3">
                  <div className="font-semibold">بنیادی معلومات</div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                    <div className="space-y-1">
                      <div className="text-muted-foreground">ٹوکن نمبر</div>
                      <div className="font-mono font-semibold">{formatValue(selectedStudentDetails?.tokenNumber ?? selectedStudent.tokenNumber)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">داخلہ نمبر</div>
                      <div className="font-mono">{formatValue(selectedStudentDetails?.admissionNumber ?? selectedStudent.admissionNumber)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">شناختی کارڈ</div>
                      <div className="font-mono">{formatValue(selectedStudentDetails?.cnic ?? selectedStudent.cnic)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">رابطہ نمبر</div>
                      <div className="font-mono">{formatValue(selectedStudentDetails?.contact ?? selectedStudent.contact)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">تعلیمی حیثیت</div>
                      <div>
                        {selectedStudentDetails?.category === 'Wafaq' || selectedStudent.category === 'Wafaq' ? 'وفاقی' : 
                         selectedStudentDetails?.category === 'Non-Wafaq' || selectedStudent.category === 'Non-Wafaq' ? 'غیر وفاقی' : 
                         formatValue(selectedStudentDetails?.category ?? selectedStudent.category)}
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">وفاقی رول نمبر</div>
                      <div className="font-mono">{formatValue(selectedStudentDetails?.wafaqRollNo ?? selectedStudent.wafaqRollNo)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">تاریخ پیدائش</div>
                      <div>{formatValue(selectedStudentDetails?.dateOfBirth)}</div>
                    </div>
                    <div className="space-y-1">
                      <div className="text-muted-foreground">عمر</div>
                      <div>{formatValue(selectedStudentDetails?.age)}</div>
                    </div>
                    <div className="space-y-1 sm:col-span-2">
                      <div className="text-muted-foreground">تاریخ داخلہ</div>
                      <div>
                        {formatValue(
                          selectedStudentDetails?.admissionDate ||
                            selectedStudentDetails?.createdAt ||
                            selectedStudent.createdAt
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="border rounded-lg p-4 space-y-3">
                  <div className="font-semibold">سابقہ معلومات</div>
                  <div className="text-sm space-y-2">
                    <div>
                      <span className="text-muted-foreground">سابقہ مدرسہ: </span>
                      {formatValue(
                        selectedStudentDetails?.previousMadrasa ??
                          selectedStudentDetails?.prevMadrasa ??
                          selectedStudent.previousMadrasa
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">سابقہ جماعت: </span>
                      {formatValue(
                        selectedStudentDetails?.previousClass ??
                          selectedStudentDetails?.prevClass ??
                          selectedStudent.previousClass
                      )}
                    </div>
                    <div>
                      <span className="text-muted-foreground">کارکردگی: </span>
                      {formatValue(selectedStudentDetails?.performance ?? selectedStudent.performance)}
                    </div>
                    <div className="pt-2">
                      <div className="text-muted-foreground">موجودہ پتہ</div>
                      <div className="whitespace-pre-wrap">{formatValue(selectedStudentDetails?.currentAddress)}</div>
                    </div>
                    <div>
                      <div className="text-muted-foreground">مستقل پتہ</div>
                      <div className="whitespace-pre-wrap">{formatValue(selectedStudentDetails?.permanentAddress)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="font-semibold">نوٹس</div>
                {loadingSelectedStudentDetails ? (
                  <div className="text-sm text-muted-foreground">لوڈ ہو رہا ہے...</div>
                ) : (
                  <div className="text-sm whitespace-pre-wrap">
                    {formatValue(selectedStudentDetails?.notes ?? selectedStudent.notes)}
                  </div>
                )}
              </div>

              <div className="border rounded-lg p-4 space-y-3">
                <div className="font-semibold">فارم فیلڈز</div>
                {loadingSelectedStudentDetails ? (
                  <div className="text-sm text-muted-foreground">لوڈ ہو رہا ہے...</div>
                ) : selectedStudentDetails?.formData &&
                  typeof selectedStudentDetails.formData === "object" ? (
                  (() => {
                    const entries = Object.entries(
                      selectedStudentDetails.formData as Record<string, any>
                    )
                      .filter(
                        ([, v]) =>
                          v !== undefined &&
                          v !== null &&
                          String(v).trim() !== ""
                      )
                      .map(([k, v]) => ({
                        key: k,
                        label: formatLabel(k),
                        value: v,
                      }))
                      .sort((a, b) => a.label.localeCompare(b.label, "ur"));

                    if (!entries.length) {
                      return (
                        <div className="text-sm text-muted-foreground">
                          کوئی فارم فیلڈ دستیاب نہیں
                        </div>
                      );
                    }

                    return (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-sm">
                        {entries.map((item) => (
                          <div
                            key={item.key}
                            className="rounded-md border bg-muted/30 p-3 space-y-1"
                          >
                            <div className="text-muted-foreground">{item.label}</div>
                            <div className="break-words">{formatValue(item.value)}</div>
                          </div>
                        ))}
                      </div>
                    );
                  })()
                ) : (
                  <div className="text-sm text-muted-foreground">تفصیل دستیاب نہیں</div>
                )}
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
