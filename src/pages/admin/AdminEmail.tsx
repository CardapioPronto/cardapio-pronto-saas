import AdminLayout from "@/components/admin/AdminLayout";
import { EmailIntegrationForm } from "@/components/email/EmailIntegrationForm";

const AdminEmail = () => {
  return (
    <AdminLayout title="Configuração de Email">
      <EmailIntegrationForm scope="system" />
    </AdminLayout>
  );
};

export default AdminEmail;
