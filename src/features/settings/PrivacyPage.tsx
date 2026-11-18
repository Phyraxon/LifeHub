import { Link } from 'react-router-dom';
import { ArrowLeft, LockKeyhole, ShieldCheck } from 'lucide-react';

export default function PrivacyPage() {
  return <section className="privacy-page">
    <Link className="privacy-back" to="/einstellungen"><ArrowLeft size={14}/>Zurück zu den Einstellungen</Link>
    <div className="welcome-line"><div><p className="eyebrow">DATENSCHUTZ</p><h1>Deine Daten bleiben deine.</h1><p className="subheading">So speichert und überträgt LIFEHUB deine Informationen.</p></div></div>
    <article className="privacy-card"><ShieldCheck size={18}/><div><h2>Lokale Speicherung</h2><p>Aufgaben, Termine, Notizen, Finanzen, Dokumente und weitere Einträge werden standardmäßig im IndexedDB-Speicher deines Browsers abgelegt. LIFEHUB hat keinen eigenen Anwendungsserver und sendet diese lokalen Daten nicht automatisch an den Betreiber.</p></div></article>
    <article className="privacy-card"><LockKeyhole size={18}/><div><h2>Freiwillige Synchronisierung</h2><p>Wenn du in den Einstellungen einen Cloud-Anbieter auswählst und „Jetzt synchronisieren“ drückst, verschlüsselt LIFEHUB einen Datenstand auf deinem Gerät und überträgt ihn direkt an den Anbieter, den du ausgewählt hast. Der Cloud-Anbieter sieht Dateinamen, Größe und Änderungszeiten, aber nicht den verschlüsselten Inhalt.</p><p>Die Verschlüsselung nutzt AES-GCM und leitet den Schlüssel mit PBKDF2-SHA-256 aus deinem Sync-Passwort ab. LIFEHUB speichert oder überträgt dieses Passwort nicht. Ohne das Passwort kann LIFEHUB deine Cloud-Sicherung nicht wiederherstellen.</p></div></article>
    <article className="privacy-card"><div className="privacy-icon-google">G</div><div><h2>Google Drive</h2><p>Google wird nur um Zugriff auf Dateien gebeten, die LIFEHUB selbst anlegt. Das Google-Zugriffstoken bleibt im Arbeitsspeicher der Sitzung. LIFEHUB fordert keinen Zugriff auf dein gesamtes Drive an.</p></div></article>
    <article className="privacy-card"><div className="privacy-icon-webdav">↗</div><div><h2>WebDAV / Nextcloud</h2><p>WebDAV-Adresse, Benutzername und App-Passwort gibst du selbst ein. Diese Zugangsdaten werden nur während der geöffneten Sitzung gehalten und direkt an den von dir eingetragenen HTTPS-Server gesendet. Der Server muss Browser-CORS für die LIFEHUB-Webseite erlauben.</p></div></article>
    <article className="privacy-card"><div className="privacy-icon-local">i</div><div><h2>Gerät und Browser</h2><p>Die lokale Datenbank ist nicht zusätzlich durch LIFEHUB verschlüsselt. Schütze daher auch dein Gerät und dein Benutzerkonto. Das Entfernen der PWA-Verknüpfung löscht lokale Daten nicht automatisch; verwalte Browserdaten und Cloud-Dateien beim jeweiligen Anbieter.</p></div></article>
    <footer className="privacy-contact">Fragen oder Hinweise: <a href="https://github.com/Phyraxon/LifeHub/issues">LIFEHUB auf GitHub</a> · Aktualisiert am 18. November 2026</footer>
  </section>;
}
