import { Power } from 'lucide-react';

export function StartupSettings() {
  return (
    <section className="settings-panel startup-panel">
      <div className="startup-title">
        <div className="settings-section-title">
          <Power size={23} />
          <div>
            <h2>Home when you turn it on</h2>
            <p>Open Our Space from your phone.</p>
          </div>
        </div>
        <span className="startup-badge">Phone remote</span>
      </div>
      <p className="startup-note">
        Vizio TVs can’t start a custom home screen on their own. Turn the TV on, open the Our Space
        remote on your phone, and tap “Open Our Space.” Nothing else needs to stay running.
      </p>
    </section>
  );
}
