import { StaffForm } from "@/components/admin/StaffForm"

export default function StaffRegistrationPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text">Staff Registration</h1>
        <p className="text-text-muted mt-1">Register a new staff member. A temporary password will be generated.</p>
      </div>
      <StaffForm />
    </div>
  )
}
