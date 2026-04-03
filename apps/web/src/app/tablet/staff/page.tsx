import StaffLoginClient from "@/app/pos/staff/staff-login-client";

export default function TabletStaffPage() {
  return (
    <div style={{ height: "100%", minHeight: 0, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
      <StaffLoginClient afterLoginRedirect="/tablet/staff" largeTouch />
    </div>
  );
}
