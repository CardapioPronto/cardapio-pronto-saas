import AdminLayout from "@/components/admin/AdminLayout";
import { EmailOperationsPanel } from "@/components/email/EmailOperationsPanel";

const AdminEmail = () => {
  return (
    <AdminLayout title="Configuração de Email">
      <EmailOperationsPanel scope="system" />
    </AdminLayout>
  );
};

export default AdminEmail;
