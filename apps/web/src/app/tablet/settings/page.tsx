import TabletSettingsClient from "../tablet-settings-client";

export default function TabletSettingsPage() {
  return (
    <div style={{ height: "100%", minHeight: 0, overflow: "auto", WebkitOverflowScrolling: "touch" }}>
      <TabletSettingsClient />
    </div>
  );
}
