import { useState, useMemo, useRef, useCallback, memo } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Email, MailFolder } from "@/types";

interface MailListProps {
  folder: MailFolder;
  emails: Email[];
  selectedEmailId: string | null;
  onSelectEmail: (id: string) => void;
}

function normalizeSubject(subject: string): string {
  return subject
    .replace(/^(Re:\s*|Fwd:\s*|\[.*?\]\s*)*/i, "")
    .replace(/\s*\(\d+\)\s*$/, "")
    .trim();
}

interface ThreadGroup {
  threadId: string;
  subject: string;
  emails: Email[];
  latestEmail: Email;
  replyCount: number;
  hasUnread: boolean;
}

const MailList = memo(function MailList({
  folder,
  emails,
  selectedEmailId,
  onSelectEmail,
}: MailListProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const filteredEmails = useMemo(
    () =>
      emails
        .filter((e) => e.status === folder)
        .filter(
          (e) =>
            e.subject.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.to.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
            e.body.toLowerCase().includes(searchQuery.toLowerCase())
        ),
    [emails, folder, searchQuery]
  );

  const threads = useMemo(() => {
    const grouped = new Map<string, ThreadGroup>();

    for (const email of filteredEmails) {
      const key = normalizeSubject(email.subject);
      if (grouped.has(key)) {
        const group = grouped.get(key)!;
        group.emails.push(email);
        if (new Date(email.date).getTime() > new Date(group.latestEmail.date).getTime()) {
          group.latestEmail = email;
        }
        group.replyCount = group.emails.length - 1;
        if (!email.isRead) group.hasUnread = true;
      } else {
        grouped.set(key, {
          threadId: key,
          subject: email.subject,
          emails: [email],
          latestEmail: email,
          replyCount: 0,
          hasUnread: !email.isRead,
        });
      }
    }

    return Array.from(grouped.values()).sort(
      (a, b) => new Date(b.latestEmail.date).getTime() - new Date(a.latestEmail.date).getTime()
    );
  }, [filteredEmails]);

  const virtualizer = useVirtualizer({
    count: threads.length,
    getScrollElement: () => scrollContainerRef.current,
    estimateSize: () => 110,
    overscan: 5,
  });

  const getFolderTitle = () => {
    switch (folder) {
      case "inbox": return "Inbox";
      case "draft": return "Drafts";
      case "sent": return "Sent Mail";
      default: return "Mailbox";
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, emailId: string) => {
    e.preventDefault();
    onSelectEmail(emailId);
  }, [onSelectEmail]);

  return (
    <div className="w-80 bg-slate-950 border-r border-slate-900 flex flex-col shrink-0 h-full select-none">
      <div className="p-4 border-b border-slate-900 flex flex-col gap-3">
        <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
          {getFolderTitle()}
          <span className="text-xs font-mono font-normal text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full">
            {threads.length}
          </span>
        </h2>
        <div className="relative">
          <input
            type="text"
            placeholder="Search mail..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-slate-900/60 border border-slate-850 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-colors"
            aria-label="Search emails"
          />
          <svg className="absolute left-3 top-2.5 w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto"
        role="listbox"
        aria-label="Email list"
      >
        {threads.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <p className="text-xs text-slate-600 font-mono">No messages in this folder.</p>
          </div>
        ) : (
          <div
            style={{ height: `${virtualizer.getTotalSize()}px`, width: "100%", position: "relative" }}
          >
            {virtualizer.getVirtualItems().map((virtualRow) => {
              const thread = threads[virtualRow.index];
              const isSelected = thread.emails.some((e) => e.id === selectedEmailId);
              const email = thread.latestEmail;
              const isUnread = thread.hasUnread;

              return (
                <div
                  key={thread.threadId}
                  ref={virtualizer.measureElement}
                  data-index={virtualRow.index}
                  onClick={() => onSelectEmail(email.id)}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/plain", email.id);
                    e.dataTransfer.effectAllowed = "move";
                  }}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, email.id)}
                  role="option"
                  aria-selected={isSelected}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${virtualRow.start}px)`,
                  }}
                  className={`p-4 flex flex-col gap-1.5 cursor-pointer hover:bg-slate-900/40 transition-colors border-l-2 ${
                    isSelected ? "bg-slate-900/70 border-indigo-500" : "border-transparent"
                  }`}
                >
                  <div className="flex justify-between items-start gap-2">
                    <span className={`text-xs truncate ${isUnread ? "text-indigo-400 font-bold" : "text-slate-400 font-medium"}`}>
                      {email.status === "draft" ? `To: ${email.to || "[Recipient]"}` : email.status === "sent" ? `To: ${email.to}` : email.from}
                    </span>
                    <span className="text-[9px] font-mono text-slate-600 shrink-0 mt-0.5">{email.date}</span>
                  </div>
                  <h4 className={`text-xs truncate ${isUnread ? "text-slate-100 font-bold" : "text-slate-300 font-semibold"}`}>
                    {email.subject || "(No Subject)"}
                  </h4>
                  <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed font-sans">
                    {email.body || "No additional text content."}
                  </p>
                  <div className="flex items-center justify-between mt-1">
                    {thread.replyCount > 0 && (
                      <span className="text-[9px] font-mono text-slate-600 bg-slate-900 px-1.5 py-0.5 rounded-full">
                        {thread.replyCount + 1} messages
                      </span>
                    )}
                    {isUnread && (
                      <span className="block h-1.5 w-1.5 bg-indigo-500 rounded-full shadow-sm shadow-indigo-500/50"></span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
});

export default MailList;
