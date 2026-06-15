import { MailFolder, Email } from "@/types";

interface MailSidebarProps {
  currentFolder: MailFolder;
  setCurrentFolder: (folder: MailFolder) => void;
  emails: Email[];
  onCompose: () => void;
}

export default function MailSidebar({
  currentFolder,
  setCurrentFolder,
  emails,
  onCompose,
}: MailSidebarProps) {
  const inboxCount = emails.filter((e) => e.status === "inbox" && !e.isRead).length;
  const draftsCount = emails.filter((e) => e.status === "draft").length;
  const sentCount = emails.filter((e) => e.status === "sent").length;

  const folders = [
    {
      id: "inbox" as MailFolder,
      name: "Inbox",
      count: inboxCount,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0a2 2 0 01-2 2H6a2 2 0 01-2-2m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4"
          />
        </svg>
      ),
    },
    {
      id: "draft" as MailFolder,
      name: "Drafts",
      count: draftsCount,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
          />
        </svg>
      ),
    },
    {
      id: "sent" as MailFolder,
      name: "Sent",
      count: sentCount,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M3 19v-8.93a2 2 0 01.89-1.664l8-5.333a2 2 0 012.22 0l8 5.333A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5m0 0l-2.25-1.5a2 2 0 00-2.22 0l-2.25 1.5"
          />
        </svg>
      ),
    },
  ];

  return (
    <div className="w-64 bg-slate-950 border-r border-slate-900 flex flex-col p-4 gap-6 select-none shrink-0 h-full">
      {/* Compose Button */}
      <button
        onClick={onCompose}
        className="w-full py-3.5 px-4 bg-gradient-to-tr from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 text-white rounded-2xl font-bold text-sm tracking-wide shadow-lg shadow-indigo-500/10 flex items-center justify-center gap-2 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
        </svg>
        Compose Draft
      </button>

      {/* Main Mailbox Folders */}
      <div className="flex flex-col gap-1.5">
        <p className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase px-3 mb-1">
          Mailboxes
        </p>
        {folders.map((folder) => {
          const isActive = currentFolder === folder.id;
          return (
            <button
              key={folder.id}
              onClick={() => setCurrentFolder(folder.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
                isActive
                  ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500 pl-2.5"
                  : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? "text-indigo-400" : "text-slate-500"}>
                  {folder.icon}
                </span>
                <span>{folder.name}</span>
              </div>
              {folder.count > 0 && (
                <span
                  className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-full ${
                    isActive ? "bg-indigo-400/20 text-indigo-400" : "bg-slate-900 text-slate-400"
                  }`}
                >
                  {folder.count}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Additional Actions / Views */}
      <div className="flex flex-col gap-1.5 pt-4 border-t border-slate-900">
        <p className="text-[10px] font-mono font-bold tracking-wider text-slate-500 uppercase px-3 mb-1">
          Services
        </p>

        <button
          onClick={() => setCurrentFolder("chat")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
            currentFolder === "chat"
              ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500 pl-2.5"
              : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
          }`}
        >
          <svg
            className={`w-5 h-5 ${currentFolder === "chat" ? "text-indigo-400" : "text-slate-500"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
            />
          </svg>
          <span>AI Assistant Chat</span>
        </button>

        <button
          onClick={() => setCurrentFolder("settings")}
          className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 cursor-pointer ${
            currentFolder === "settings"
              ? "bg-indigo-500/10 text-indigo-400 border-l-2 border-indigo-500 pl-2.5"
              : "text-slate-400 hover:bg-slate-900/60 hover:text-slate-200"
          }`}
        >
          <svg
            className={`w-5 h-5 ${currentFolder === "settings" ? "text-indigo-400" : "text-slate-500"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
            />
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
          <span>Settings & Accounts</span>
        </button>
      </div>
    </div>
  );
}
