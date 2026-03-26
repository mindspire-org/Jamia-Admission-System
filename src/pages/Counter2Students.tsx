import { useEffect, useMemo, useState } from "react";
import { Edit, Trash2, CheckCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { studentsAPI } from "@/lib/api";
import { toast } from "sonner";

type StatusFilter = "all" | "approved" | "pending" | "rejected";

type StudentStatus = "pending" | "verified" | "rejected";

interface StudentRow {
  id: string;
  rollNumber: string;
  name: string;
  fatherName: string;
  class: string;
  admissionDate: string;
  status: StudentStatus;
  tokenNumber?: string;
  cnic?: string;
  contact?: string;
  category?: string;
  previousMadrasa?: string;
  previousClass?: string;
  performance?: string;
  wafaqRollNo?: string;
  notes?: string;
}

function normalizeForFilter(status: StudentStatus): Exclude<StatusFilter, "all"> {
  if (status === "verified") return "approved";
  if (status === "pending") return "pending";
  return "rejected";
}

export default function Counter2Students() {
  const navigate = useNavigate();
  const [students, setStudents] = useState<StudentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [editing, setEditing] = useState<StudentRow | null>(null);
  const [admissionFormData, setAdmissionFormData] = useState<any>(null);
  const [editForm, setEditForm] = useState({
    name: "",
    fatherName: "",
    class: "",
    cnic: "",
    contact: "",
    category: "",
    previousMadrasa: "",
    previousClass: "",
    performance: "",
    wafaqRollNo: "",
    notes: "",
    status: "approved" as Exclude<StatusFilter, "all">,
  });

  const refresh = async () => {
    setLoading(true);
    try {
      const status =
        statusFilter === "all"
          ? undefined
          : statusFilter === "approved"
            ? "verified"
            : statusFilter === "pending"
              ? "pending"
              : "rejected";
      const res = await studentsAPI.getCounter2({ status, search: query.trim() || undefined });
      const rows = (res.data.data ?? []) as any[];
      
      let mappedRows = rows.map((s) => ({
        id: s._id,
        rollNumber: s.admissionNumber || s.tokenNumber,
        name: s.studentName,
        fatherName: s.fatherName,
        class: s.class,
        admissionDate: s.verifiedAt
          ? new Date(s.verifiedAt).toLocaleDateString("ur-PK")
          : s.createdAt
            ? new Date(s.createdAt).toLocaleDateString("ur-PK")
            : "",
        status: s.status,
        tokenNumber: s.tokenNumber,
        cnic: s.cnic,
        contact: s.contact,
        category: s.category,
        previousMadrasa: s.previousMadrasa,
        previousClass: s.previousClass,
        performance: s.performance,
        wafaqRollNo: s.wafaqRollNo,
        notes: s.notes,
      }));
      
      // If API returns no students, try loading from localStorage tokens
      if (mappedRows.length === 0 && query.trim()) {
        const tokensData = localStorage.getItem("jamia_tokens_v1");
        if (tokensData) {
          try {
            const tokens = JSON.parse(tokensData);
            const searchLower = query.toLowerCase();
            const matchingTokens = tokens.filter((t: any) => 
              t.tokenNumber?.toLowerCase().includes(searchLower) ||
              t.studentName?.toLowerCase().includes(searchLower) ||
              t.fatherName?.toLowerCase().includes(searchLower)
            );
            
            mappedRows = matchingTokens.map((t: any) => ({
              id: t.id || Date.now().toString(),
              rollNumber: t.tokenNumber,
              name: t.studentName,
              fatherName: t.fatherName,
              class: t.class,
              admissionDate: t.issueDate || new Date().toLocaleDateString("ur-PK"),
              status: "pending",
              tokenNumber: t.tokenNumber,
              cnic: t.cnic,
              contact: t.contact,
              category: t.category || "Wafaq",
              previousMadrasa: "",
              previousClass: "",
              performance: "",
              wafaqRollNo: "",
              notes: "",
            }));
            
            if (mappedRows.length > 0) {
              toast.info("لوکل اسٹوریج سے طلباء لوڈ ہوئے");
            }
          } catch (e) {
            console.error("Error loading from localStorage:", e);
          }
        }
      }
      
      // Only update if API returned data, otherwise keep localStorage data
      if (mappedRows.length > 0) {
        setStudents(mappedRows);
      }
      // If API empty but search was entered, filter localStorage
      else if (query.trim()) {
        const tokensData = localStorage.getItem("jamia_tokens_v1");
        if (tokensData) {
          try {
            const tokens = JSON.parse(tokensData);
            const searchLower = query.toLowerCase();
            const matchingTokens = tokens.filter((t: any) => 
              t.tokenNumber?.toLowerCase().includes(searchLower) ||
              t.studentName?.toLowerCase().includes(searchLower) ||
              t.fatherName?.toLowerCase().includes(searchLower)
            );
            
            const filteredRows = matchingTokens.map((t: any) => ({
              id: t.id || Date.now().toString(),
              rollNumber: t.tokenNumber,
              name: t.studentName,
              fatherName: t.fatherName,
              class: t.class,
              admissionDate: t.issueDate || new Date().toLocaleDateString("ur-PK"),
              status: "pending",
              tokenNumber: t.tokenNumber,
              cnic: t.cnic,
              contact: t.contact,
              category: t.category || "Wafaq",
              previousMadrasa: "",
              previousClass: "",
              performance: "",
              wafaqRollNo: "",
              notes: "",
            }));
            
            if (filteredRows.length > 0) {
              setStudents(filteredRows);
              toast.info("لوکل اسٹوریج سے طلباء لوڈ ہوئے");
            }
          } catch (e) {
            console.error("Error filtering localStorage:", e);
          }
        }
      }
      // If no search and API empty, keep localStorage data as-is
    } catch (e: any) {
      toast.error(e?.response?.data?.message || "طلباء لوڈ نہیں ہو سکے");
      
      // Fallback: Load from localStorage on API error
      if (query.trim()) {
        const tokensData = localStorage.getItem("jamia_tokens_v1");
        if (tokensData) {
          try {
            const tokens = JSON.parse(tokensData);
            const searchLower = query.toLowerCase();
            const matchingTokens = tokens.filter((t: any) => 
              t.tokenNumber?.toLowerCase().includes(searchLower) ||
              t.studentName?.toLowerCase().includes(searchLower) ||
              t.fatherName?.toLowerCase().includes(searchLower)
            );
            
            const rows = matchingTokens.map((t: any) => ({
              id: t.id || Date.now().toString(),
              rollNumber: t.tokenNumber,
              name: t.studentName,
              fatherName: t.fatherName,
              class: t.class,
              admissionDate: t.issueDate || new Date().toLocaleDateString("ur-PK"),
              status: "pending",
              tokenNumber: t.tokenNumber,
              cnic: t.cnic,
              contact: t.contact,
              category: t.category || "Wafaq",
              previousMadrasa: "",
              previousClass: "",
              performance: "",
              wafaqRollNo: "",
              notes: "",
            }));
            
            setStudents(rows);
            if (rows.length > 0) {
              toast.info("لوکل اسٹوریج سے طلباء لوڈ ہوئے (API فیل)");
            }
          } catch (e) {
            console.error("Error loading from localStorage:", e);
          }
        }
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  // Load all tokens from localStorage immediately on mount
  useEffect(() => {
    const loadFromLocalStorage = () => {
      const tokensData = localStorage.getItem("jamia_tokens_v1");
      if (tokensData) {
        try {
          const tokens = JSON.parse(tokensData);
          const rows = tokens.map((t: any) => ({
            id: t.id || Date.now().toString(),
            rollNumber: t.tokenNumber,
            name: t.studentName,
            fatherName: t.fatherName,
            class: t.class,
            admissionDate: t.issueDate || new Date().toLocaleDateString("ur-PK"),
            status: "pending",
            tokenNumber: t.tokenNumber,
            cnic: t.cnic,
            contact: t.contact,
            category: t.category || "Wafaq",
            previousMadrasa: "",
            previousClass: "",
            performance: "",
            wafaqRollNo: "",
            notes: "",
          }));
          
          if (rows.length > 0) {
            setStudents(rows);
            console.log("Auto-loaded from localStorage on mount:", rows.length, "students");
          }
        } catch (e) {
          console.error("Error loading from localStorage:", e);
        }
      }
    };
    
    // Load immediately
    loadFromLocalStorage();
    
    // Then try API (but don't overwrite if API returns empty)
    const timer = setTimeout(() => {
      refresh();
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim();
    return students.filter((s) => {
      const matchesQuery =
        !q ||
        s.rollNumber.includes(q) ||
        s.name.includes(q) ||
        s.fatherName.includes(q) ||
        s.class.includes(q) ||
        (s.tokenNumber ? s.tokenNumber.includes(q) : false);

      const matchesStatus =
        statusFilter === "all" ? true : normalizeForFilter(s.status) === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [students, query, statusFilter]);

  const openEdit = (student: StudentRow) => {
    setEditing(student);
    setEditForm({
      name: student.name,
      fatherName: student.fatherName,
      class: student.class,
      cnic: student.cnic ?? "",
      contact: student.contact ?? "",
      category: student.category ?? "",
      previousMadrasa: student.previousMadrasa ?? "",
      previousClass: student.previousClass ?? "",
      performance: student.performance ?? "",
      wafaqRollNo: student.wafaqRollNo ?? "",
      notes: student.notes ?? "",
      status: normalizeForFilter(student.status),
    });
    
    // Load admission form data from /verification page
    if (student.tokenNumber) {
      const savedFormData = localStorage.getItem(`admissionForm_${student.tokenNumber}`);
      if (savedFormData) {
        try {
          const parsed = JSON.parse(savedFormData);
          setAdmissionFormData(parsed);
          
          // Populate form fields from admission form
          setEditForm(prev => ({
            ...prev,
            wafaqRollNo: parsed.wafaqRollNo || prev.wafaqRollNo,
            previousClass: parsed.previousClass || parsed.lastGrade || prev.previousClass,
            previousMadrasa: parsed.schoolName || prev.previousMadrasa,
          }));
          
          toast.success("داخلہ فارم کی تفصیلات لوڈ ہو گئیں");
        } catch (e) {
          console.error("Error parsing admission form:", e);
          setAdmissionFormData(null);
        }
      } else {
        setAdmissionFormData(null);
      }
    } else {
      setAdmissionFormData(null);
    }
  };

  const closeEdit = () => {
    setEditing(null);
    setAdmissionFormData(null);
  };

  const sanitizePatch = (data: any) => {
    const next = { ...data };
    if (typeof next.performance === "string" && next.performance.trim() === "") {
      next.performance = undefined;
    }
    return next;
  };

  const saveEdit = () => {
    if (!editing) return;

    (async () => {
      try {
        const status =
          editForm.status === "approved"
            ? "verified"
            : editForm.status === "pending"
              ? "pending"
              : "rejected";
        await studentsAPI.updateCounter2(
          editing.id,
          sanitizePatch({
            studentName: editForm.name,
            fatherName: editForm.fatherName,
            class: editForm.class,
            cnic: editForm.cnic,
            contact: editForm.contact,
            category: editForm.category,
            previousMadrasa: editForm.previousMadrasa,
            previousClass: editForm.previousClass,
            performance: editForm.performance,
            wafaqRollNo: editForm.wafaqRollNo,
            notes: editForm.notes,
            status,
          })
        );
        toast.success("طالب علم اپڈیٹ ہو گیا");
        closeEdit();
        await refresh();
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "اپڈیٹ نہیں ہو سکا");
      }
    })();
  };

  const deleteStudent = (id: string) => {
    (async () => {
      try {
        await studentsAPI.deleteCounter2(id);
        toast.success("طالب علم حذف ہو گیا");
        await refresh();
      } catch (e: any) {
        toast.error(e?.response?.data?.message || "حذف نہیں ہو سکا");
      }
    })();
  };

  return (
    <DashboardLayout title="طلباء مینجمنٹ">
      <PageHeader
        title="طلباء"
        description="یہاں سے طلباء (منظور شدہ / زیرِ التواء / مسترد) دیکھیں، اپڈیٹ کریں یا حذف کریں"
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>تلاش اور فلٹر</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="رول نمبر، نام، والد کا نام، درجہ یا ٹوکن سے تلاش کریں"
            className="h-12"
          />

          <div className="space-y-2">
            <Label>حیثیت</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)}>
              <SelectTrigger className="h-12">
                <SelectValue placeholder="حیثیت منتخب کریں" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">تمام</SelectItem>
                <SelectItem value="approved">منظور شدہ</SelectItem>
                <SelectItem value="pending">زیرِ التواء</SelectItem>
                <SelectItem value="rejected">مسترد</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>تمام طلباء ({filtered.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center text-muted-foreground py-10">
              لوڈ ہو رہا ہے...
            </div>
          ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-right">رول نمبر</TableHead>
                <TableHead className="text-right">نام</TableHead>
                <TableHead className="text-right">والد کا نام</TableHead>
                <TableHead className="text-right">درجہ</TableHead>
                <TableHead className="text-right">تاریخ داخلہ</TableHead>
                <TableHead className="text-right">حیثیت</TableHead>
                <TableHead className="text-right">عمل</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length > 0 ? (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono font-semibold">{s.rollNumber}</TableCell>
                    <TableCell className="font-semibold">{s.name}</TableCell>
                    <TableCell>{s.fatherName}</TableCell>
                    <TableCell>{s.class}</TableCell>
                    <TableCell>{s.admissionDate}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {s.tokenNumber ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              navigate(`/verification?token=${encodeURIComponent(s.tokenNumber || "")}`)
                            }
                          >
                            فارم ایڈٹ
                          </Button>
                        ) : null}

                        <Button size="sm" variant="outline" onClick={() => openEdit(s)}>
                          <Edit className="h-4 w-4" />
                        </Button>

                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
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
                                onClick={() => deleteStudent(s.id)}
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
                  <TableCell colSpan={7} className="text-center text-muted-foreground py-10">
                    کوئی طالب علم نہیں ملا
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editing} onOpenChange={(open) => !open && closeEdit()}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>طالب علم میں ترمیم</DialogTitle>
            <DialogDescription>معلومات اور حیثیت اپڈیٹ کریں</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>نام</Label>
                <Input value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>والد کا نام</Label>
                <Input
                  value={editForm.fatherName}
                  onChange={(e) => setEditForm({ ...editForm, fatherName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>درجہ</Label>
                <Input value={editForm.class} onChange={(e) => setEditForm({ ...editForm, class: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>حیثیت</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) => setEditForm({ ...editForm, status: v as Exclude<StatusFilter, "all"> })}
                >
                  <SelectTrigger className="h-10">
                    <SelectValue placeholder="حیثیت" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">منظور شدہ</SelectItem>
                    <SelectItem value="pending">زیرِ التواء</SelectItem>
                    <SelectItem value="rejected">مسترد</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>شناختی کارڈ</Label>
                <Input value={editForm.cnic} onChange={(e) => setEditForm({ ...editForm, cnic: e.target.value })} />
              </div>
              <div className="space-y-2">
                <Label>رابطہ نمبر</Label>
                <Input
                  value={editForm.contact}
                  onChange={(e) => setEditForm({ ...editForm, contact: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>تعلیمی حیثیت</Label>
                <Input
                  value={editForm.category}
                  onChange={(e) => setEditForm({ ...editForm, category: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>سابقہ مدرسہ</Label>
                <Input
                  value={editForm.previousMadrasa}
                  onChange={(e) => setEditForm({ ...editForm, previousMadrasa: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>سابقہ درجہ</Label>
                <Input
                  value={editForm.previousClass}
                  onChange={(e) => setEditForm({ ...editForm, previousClass: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>کارکردگی</Label>
                <Input
                  value={editForm.performance}
                  onChange={(e) => setEditForm({ ...editForm, performance: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>وفاقی رول نمبر</Label>
                <Input
                  value={editForm.wafaqRollNo}
                  onChange={(e) => setEditForm({ ...editForm, wafaqRollNo: e.target.value })}
                />
              </div>
            </div>

            {/* ── Admission Form Data from /verification ───────────────── */}
            {admissionFormData && (
              <div className="space-y-3 rounded-lg border bg-green-50/40 dark:bg-green-950/10 p-4">
                <p className="text-xs font-semibold text-green-700 dark:text-green-400 flex items-center gap-1.5">
                  <CheckCircle className="h-3.5 w-3.5" />
                  داخلہ فارم کی معلومات (ورڈ سے)
                </p>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {admissionFormData.name && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">نام:</span>
                      <span className="font-semibold">{admissionFormData.name}</span>
                    </div>
                  )}
                  {admissionFormData.fatherName && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">والد:</span>
                      <span className="font-semibold">{admissionFormData.fatherName}</span>
                    </div>
                  )}
                  {admissionFormData.dob && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">پیدائش:</span>
                      <span className="font-semibold">{admissionFormData.dob}</span>
                    </div>
                  )}
                  {admissionFormData.phone && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">فون:</span>
                      <span className="font-semibold" dir="ltr">{admissionFormData.phone}</span>
                    </div>
                  )}
                  {admissionFormData.cnic && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">شناختی کارڈ:</span>
                      <span className="font-semibold" dir="ltr">{admissionFormData.cnic}</span>
                    </div>
                  )}
                  {admissionFormData.desiredGrade && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">مطلوبہ درجہ:</span>
                      <span className="font-semibold">{admissionFormData.desiredGrade}</span>
                    </div>
                  )}
                  {admissionFormData.lastGrade && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">آخری پاس کردہ درجہ:</span>
                      <span className="font-semibold">{admissionFormData.lastGrade}</span>
                    </div>
                  )}
                  {admissionFormData.schoolName && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-600">سابقہ مدرسہ:</span>
                      <span className="font-semibold">{admissionFormData.schoolName}</span>
                    </div>
                  )}
                  {admissionFormData.currentAddress && (
                    <div className="flex justify-between col-span-2">
                      <span className="text-gray-600">موجودہ پتہ:</span>
                      <span className="font-semibold">{admissionFormData.currentAddress}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label>نوٹس</Label>
              <Textarea
                value={editForm.notes}
                onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                className="min-h-[120px]"
              />
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
    </DashboardLayout>
  );
}
