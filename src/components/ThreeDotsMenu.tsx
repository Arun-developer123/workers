"use client";

import React, { FC, JSX, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  FiMoreHorizontal,
  FiUser,
  FiClipboard,
  FiMessageCircle,
  FiShield,
  FiSettings,
  FiLogOut,
  FiTruck,
  FiShoppingCart,
  FiPlus,
  FiUsers,
  FiFileText,
  FiDownload,
  FiShare2,
  FiAlertCircle,
  FiToggleRight,
} from "react-icons/fi";

// Minimal Profile shape used by this component (keeps file self-contained)
export interface ProfileMini {
  user_id: string;
  name?: string | null;
  role: "worker" | "contractor";
  phone?: string | null;
  is_ekyc_complete?: boolean | null;
  safety_fund_joined?: boolean | null;
}

type Props = Readonly<{
  profileRole: "worker" | "contractor";
  profile?: ProfileMini | null;
}>;

type MenuItem = {
  id: string;
  label: string;
  icon: JSX.Element;
  visible?: boolean;
  onClick: () => Promise<void> | void;
  destructive?: boolean;
};

const ThreeDotsMenu: FC<Props> = ({ profileRole, profile = null }: Props) => {
  const router = useRouter();
  const [open, setOpen] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [availability, setAvailability] = useState<boolean>(true);
  const [exporting, setExporting] = useState<boolean>(false);

  useEffect(() => {
    const onDocClick = (ev: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(ev.target as Node)) {
        setOpen(false);
      }
    };

    const onKey = (ev: KeyboardEvent) => {
      if (ev.key === "Escape") {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", onDocClick);
    document.addEventListener("keydown", onKey);

    return () => {
      document.removeEventListener("mousedown", onDocClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  // Helpers
  const safeProfileId = (): string => profile?.user_id ?? "";

  const nav = (path: string): void => {
    setOpen(false);
    void router.push(path);
  };

  const toggleAvailability = async (): Promise<void> => {
    // optimistic UI update
    const next = !availability;
    setAvailability(next);

    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: safeProfileId(), available: next }),
      });

      if (!res.ok) {
        throw new Error(`status:${res.status}`);
      }
    } catch (err) {
      // rollback
      setAvailability((p) => !p);
      // eslint-disable-next-line no-alert
      alert("Availability update failed — कृपया बाद में कोशिश करें");
    } finally {
      setOpen(false);
    }
  };

  const handleExportApplications = async (): Promise<void> => {
    if (!profile || profile.role !== "contractor") {
      // eslint-disable-next-line no-alert
      alert("Export केवल Contractors के लिए है");
      return;
    }
    const proceed = confirm("Export करना है? यह एक CSV फाइल बनाएगा।");
    if (!proceed) {
      setOpen(false);
      return;
    }

    setExporting(true);

    try {
      const res = await fetch(`/api/export-applications?contractorId=${encodeURIComponent(profile.user_id)}`);
      if (!res.ok) {
        throw new Error(`Export failed: ${res.status}`);
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `applications_${profile.user_id}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert("Export में error — console देखें");
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setExporting(false);
      setOpen(false);
    }
  };

  const handleShareProfile = (): void => {
    if (!profile) {
      setOpen(false);
      return;
    }

    const shareUrl = `${window.location.origin}/workers/${encodeURIComponent(profile.user_id)}`;

    if (navigator.share) {
      void navigator
        .share({ title: profile.name ?? "Profile", url: shareUrl })
        .catch(() => {
          // ignore share errors
        });
    } else {
      void navigator.clipboard
        .writeText(shareUrl)
        .then(() => {
          // eslint-disable-next-line no-alert
          alert("Profile link clipboard में copy हो गया");
        })
        .catch(() => {
          // fallback: open link
          window.open(shareUrl, "_blank", "noopener");
        });
    }

    setOpen(false);
  };

  const handleLogout = async (): Promise<void> => {
    const ok = confirm("क्या आप लॉग आउट करना चाहते हैं?");
    if (!ok) return;

    try {
      // clear local profile and navigate to sign-in
      localStorage.removeItem("fake_user_profile");
      // any other cleanup endpoints could be called here
      void router.push("/auth/sign-in");
    } catch (err) {
      // eslint-disable-next-line no-alert
      alert("Logout में समस्या — console देखें");
      // eslint-disable-next-line no-console
      console.error(err);
    } finally {
      setOpen(false);
    }
  };

  // Build menu items — order matters (common first)
  const items: MenuItem[] = [
    {
      id: "profile",
      label: "प्रोफ़ाइल देखें / संपादित करें",
      icon: <FiUser className="w-4 h-4" />,
      onClick: () => nav(`/profile?user_id=${encodeURIComponent(safeProfileId())}`),
    },
    {
      id: "applications",
      label: "मेरे आवेदन",
      icon: <FiClipboard className="w-4 h-4" />,
      onClick: () => nav("/applications"),
    },
    {
      id: "messages",
      label: "Messages",
      icon: <FiMessageCircle className="w-4 h-4" />,
      onClick: () => nav("/messages"),
    },
    {
      id: "safety",
      label: profile?.is_ekyc_complete ? "Safety Fund / Manage" : "Join Safety Fund",
      icon: <FiShield className="w-4 h-4" />,
      onClick: () => nav("/safety-fund-details"),
    },
    {
      id: "help",
      label: "Help & Support",
      icon: <FiAlertCircle className="w-4 h-4" />,
      onClick: () => nav("/help"),
    },
    {
      id: "settings",
      label: "Settings",
      icon: <FiSettings className="w-4 h-4" />,
      onClick: () => nav("/settings"),
    },
  ];

  // Role-specific additions
  if (profileRole === "worker") {
    items.push(
      {
        id: "toggle-availability",
        label: availability ? "Go offline" : "Go available",
        icon: <FiToggleRight className="w-4 h-4" />,
        onClick: toggleAvailability,
      },
      {
        id: "svari",
        label: "Svari (Transport)",
        icon: <FiTruck className="w-4 h-4" />,
        onClick: () => nav("/svari"),
      },
      {
        id: "shop",
        label: "Shop",
        icon: <FiShoppingCart className="w-4 h-4" />,
        onClick: () => nav("/shop"),
      },
      {
        id: "share",
        label: "Share Profile",
        icon: <FiShare2 className="w-4 h-4" />,
        onClick: handleShareProfile,
      }
    );
  }

  if (profileRole === "contractor") {
    items.push(
      {
        id: "new-job",
        label: "नया काम डालें",
        icon: <FiPlus className="w-4 h-4" />,
        onClick: () => nav("/jobs/new"),
      },
      {
        id: "workers",
        label: "Workers देखें",
        icon: <FiUsers className="w-4 h-4" />,
        onClick: () => nav("/workers"),
      },
      {
        id: "materials",
        label: "Materials",
        icon: <FiFileText className="w-4 h-4" />,
        onClick: () => nav("/contractor/materials"),
      },
      {
        id: "export",
        label: exporting ? "Exporting..." : "Export applications (CSV)",
        icon: <FiDownload className="w-4 h-4" />,
        onClick: handleExportApplications,
      }
    );
  }

  // Logout last
  items.push({
    id: "logout",
    label: "Logout",
    icon: <FiLogOut className="w-4 h-4" />,
    destructive: true,
    onClick: handleLogout,
  });

  return (
    <div ref={containerRef} className="relative inline-block text-left">
      <button
        type="button"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="More actions"
        onClick={() => setOpen((s) => !s)}
        className="p-2 rounded-md hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <FiMoreHorizontal className="w-5 h-5" />
      </button>

      {open && (
        <div
          role="menu"
          aria-orientation="vertical"
          aria-labelledby="more-actions"
          className="absolute right-0 mt-2 w-56 rounded-lg bg-white shadow-lg ring-1 ring-black/5 z-50"
        >
          <ul className="divide-y divide-gray-100" role="none">
            {items.map((it) => {
              if (it.visible === false) return null;
              return (
                <li key={it.id} role="none">
                  <button
                    type="button"
                    role="menuitem"
                    onClick={async (ev) => {
                      ev.preventDefault();
                      try {
                        const maybePromise = it.onClick();
                        if (maybePromise instanceof Promise) {
                          await maybePromise;
                        }
                      } catch (error) {
                        // eslint-disable-next-line no-console
                        console.error(error);
                      }
                    }}
                    className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm hover:bg-gray-50 focus:outline-none ${it.destructive ? "text-red-600" : "text-gray-800"}`}
                  >
                    <span className="text-gray-600">{it.icon}</span>
                    <span className="flex-1">{it.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
};

export default ThreeDotsMenu;
