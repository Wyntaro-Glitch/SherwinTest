import { useState } from "react";
import { Email, MailFolder } from "@/types";

interface MailListProps {
  folder: MailFolder;
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
}

export default function MailList({
  folder,
  emails,
  selectedEmailId,
  onSelectEmail,
}: MailListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredEmails = emails
    .filter((e) => e.status === folder)
    .filter(
      (e) =>
        e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
        e.body.toLowerCase().includes(searchQuery.toLowerCase())
    );

  const getFolderTitle = () => {
    switch (folder) {
      case "inbox":
        return "Inbox";
      case "draft":
        return "Drafts";
      case "sent":
        return "Sent Mail";
      default:
        return "Mailbox";
    }
  };

  return (
    <div className="w-80 bg-slate-950 border-r border-slate-900 flex flex-col shrink-0 h-full select-none">
      {/* Search Header */}
      <div className="p-4 border-b border-slate-900 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          {getFolderTitle()}
          <span className="text-xs font-mono font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">
            {filteredEmails.length}
          </span>
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-850 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <svg
            className="absolute left-3 top-2.5 w-4 h-4 text-slate-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
      </div>

      {/* List items */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-950/60">
        {filteredEmails.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-xs text-slate-600 font-mono">No messages in this folder.</p>
          </div>
        ) : (
          filteredEmails.map((email) => {
            const isSelected = selectedEmailId === email.id;
            const isUnread = !email.isRead && email.status === "inbox";
            return (
              <div
                key={email.id}
                onClick={() => onSelectEmail(email.id)}
                className={`p-4 flex flex-col gap-1.5 cursor-pointer hover:bg-slate-900/40 transition-colors border-l-2 ${
                  isSelected
                    ? "bg-slate-900/70 border-indigo-500"
                    : "border-transparent"
                }`}
              >
                <div className="flex justify-between items-start gap-2">
                  <span className={`text-xs truncate ${isUnread ? "text-indigo-400 font-bold" : "text-slate-400 font-medium"}`}>
                    {email.status === "draft" ? `To: ${email.to || "[Recipient]"}` : email.status === "sent" ? `To: ${email.to}` : email.from}
                  </span>
                  <span className="text-[9px] font-mono text-slate-600 shrink-0 mt-0.5">
                    {email.date}
                  </span>
                </div>
                
                <h4 className={`text-xs truncate ${isUnread ? "text-slate-100 font-bold" : "text-slate-300 font-semibold"}`}>
                  {email.subject || "(No Subject)"}
                </h4>

                <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-sans">
                  {email.body || "No additional text content."}
                </p>

                {isUnread && (
                  <span className="self-end block h-1.5 w-1.5 bg-indigo-500 rounded-full shadow-sm shadow-indigo-500/50 mt-1"></span>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
