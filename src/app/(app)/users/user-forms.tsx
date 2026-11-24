"use client";

import { useState, useTransition } from "react";
import { ActionMenu } from "@/components/ui/action-menu";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge, Card, Notice } from "@/components/ui/card";
import { ConfirmCard, Sheet } from "@/components/ui/confirm-card";
import { CopyField } from "@/components/ui/copy-field";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import { Field } from "@/components/ui/field";
import { FormSelect } from "@/components/ui/form-select";
import { Modal } from "@/components/ui/modal";
import { IconButton } from "@/components/ui/icon-button";
import { MultiSelectSearch } from "@/components/ui/multi-select-search";
import { ROLE_LABEL, ROLES, type Role } from "@/config/roles";
import { DeleteIcon, EditIcon, TeamIcon } from "@/lib/icons";
import {
  countOwnedLeads,
  createInvite,
  transferAllLeads,
  updateUser,
} from "./actions";

export type UserRow = {
  id: string;
  full_name: string;
  email: string;
  role: Role;
  status: "pending" | "active" | "disabled";
  avatar_url: string;
  projectIds: string[];
};
export type ProjectOption = { id: string; name: string };

const ERROR: Record<string, string> = {
  last_admin: "ต้องมีแอดมินที่ใช้งานได้อย่างน้อย 1 คน",
  failed: "บันทึกไม่สำเร็จ ลองใหม่อีกครั้ง",
};

const ROLE_OPTIONS = ROLES.map((r) => ({ id: r, label: ROLE_LABEL[r] }));

function ProjectChecks({
  projects,
  value,
  onChange,
}: {
  projects: ProjectOption[];
  value: string[];
  onChange: (ids: string[]) => void;
}) {
  if (projects.length === 0)
    return (
      <p className="text-sm text-ink-soft">
        ยังไม่มีโครงการ เพิ่มได้ที่เมนูโครงการ แล้วกลับมามอบหมายทีหลัง
      </p>
    );
  return (
    <div className="flex flex-col gap-1">
      <span className="text-sm font-medium">โครงการที่ดูแล</span>
      <MultiSelectSearch
        options={projects.map((p) => ({ id: p.id, label: p.name }))}
        value={value}
        onChange={onChange}
        placeholder="เลือกโครงการ"
        searchPlaceholder="ค้นหาโครงการ"
        aria-label="โครงการที่ดูแล"
      />
    </div>
  );
}

/** Row on the admin's waiting list. The approve button stays grey until a role is chosen. */
export function ApproveCard({
  user,
  projects,
}: {
  user: UserRow;
  projects: ProjectOption[];
}) {
  const [role, setRole] = useState<Role | "">("");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const approve = () =>
    start(async () => {
      if (!role) return;
      const res = await updateUser({
        userId: user.id,
        role,
        status: "active",
        projectIds,
      });
      if (!res.ok) setError(ERROR[res.error] ?? ERROR.failed);
    });

  return (
    <Card className="flex flex-col gap-3">
      <div className="flex min-w-0 items-center gap-3">
        <Avatar
          name={user.full_name || user.email}
          url={user.avatar_url}
          size="lg"
        />
        <div className="min-w-0">
          <p className="break-words">{user.full_name || "ไม่ได้ใส่ชื่อ"}</p>
          <p className="truncate text-sm text-ink-soft">{user.email}</p>
        </div>
      </div>
      {error && <Notice tone="danger">{error}</Notice>}
      <Field label="ระดับผู้ใช้" required>
        <FormSelect
          options={ROLE_OPTIONS}
          value={role}
          onChange={(v) => setRole(v as Role | "")}
          placeholder="เลือกระดับ"
        />
      </Field>
      {role && role !== "admin" && (
        <ProjectChecks
          projects={projects}
          value={projectIds}
          onChange={setProjectIds}
        />
      )}
      <Button full disabled={!role || busy} onClick={approve}>
        {busy ? "กำลังบันทึก" : role ? `อนุมัติเป็น${ROLE_LABEL[role]}` : "อนุมัติ"}
      </Button>
    </Card>
  );
}

/** The users page list: a table from 1024px, cards below. Row actions sit in the ⋯ menu. */
export function UsersTable({
  users,
  projects,
  meId,
  targets,
}: {
  users: UserRow[];
  projects: ProjectOption[];
  meId: string;
  targets: UserRow[];
}) {
  const projectName = new Map(projects.map((p) => [p.id, p.name]));
  const projectsOf = (u: UserRow) => {
    if (u.role === "admin") return "-";
    const names = u.projectIds.map((id) => projectName.get(id)).filter(Boolean);
    return names.length
      ? names.join(" · ")
      : u.role === "executive"
        ? "ทุกโครงการ"
        : "ยังไม่มีโครงการ";
  };
  const statusBadge = (u: UserRow) =>
    u.status === "disabled" ? (
      <Badge tone="danger">ปิดสิทธิ์แล้ว</Badge>
    ) : u.status === "pending" ? (
      <Badge tone="warn">รออนุมัติ</Badge>
    ) : (
      <Badge tone="ok">ใช้งานอยู่</Badge>
    );
  const nameCell = (u: UserRow) => (
    <div className="flex min-w-0 items-center gap-3">
      <Avatar name={nameOf(u)} url={u.avatar_url} size="lg" />
      <div className="min-w-0">
        <p className="truncate">
          {nameOf(u)}{" "}
          {u.id === meId && <span className="text-sm text-ink-soft">(คุณ)</span>}
        </p>
        <p className="truncate text-sm text-ink-soft">{u.email}</p>
      </div>
    </div>
  );
  const actions = (u: UserRow) => (
    <UserActions
      user={u}
      projects={projects}
      isMe={u.id === meId}
      targets={targets}
    />
  );

  const columns: DataTableColumn<UserRow>[] = [
    {
      key: "full_name",
      header: "ผู้ใช้",
      sortable: true,
      sortValue: nameOf,
      render: nameCell,
    },
    {
      key: "role",
      header: "ระดับ",
      sortable: true,
      sortValue: (u) => ROLE_LABEL[u.role],
      render: (u) => <Badge tone="brand">{ROLE_LABEL[u.role]}</Badge>,
    },
    {
      key: "projects",
      header: "โครงการ",
      render: (u) => <span className="text-ink-soft">{projectsOf(u)}</span>,
    },
    { key: "status", header: "สถานะ", sortable: true, render: statusBadge },
    {
      key: "actions",
      header: <span className="sr-only">ตัวเลือก</span>,
      label: "ตัวเลือก",
      align: "right",
      hideable: false,
      width: 112,
      render: actions,
    },
  ];

  return (
    <DataTable
      columns={columns}
      data={users}
      rowKey="id"
      storageKey="salesdesk.users"
      caption="รายชื่อผู้ใช้"
      emptyState="ไม่มีผู้ใช้ในหมวดนี้"
      mobileCardRender={(u) => (
        <div className="flex items-start justify-between gap-2">
          <div className="flex min-w-0 flex-col gap-2">
            {nameCell(u)}
            <div className="flex flex-wrap gap-1">
              <Badge tone="brand">{ROLE_LABEL[u.role]}</Badge>
              {u.status !== "active" && statusBadge(u)}
              {u.role !== "admin" && <Badge>{projectsOf(u)}</Badge>}
            </div>
          </div>
          {actions(u)}
        </div>
      )}
    />
  );
}

/** ⋯ menu of one user: edit role and projects, move all leads, disable. */
function UserActions({
  user,
  projects,
  isMe,
  targets = [],
}: {
  user: UserRow;
  projects: ProjectOption[];
  isMe: boolean;
  targets?: UserRow[];
}) {
  const [open, setOpen] = useState(false);
  const [transfer, setTransfer] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [role, setRole] = useState<Role>(user.role);
  const [projectIds, setProjectIds] = useState<string[]>(user.projectIds);
  const [error, setError] = useState("");
  const [busy, start] = useTransition();

  const save = (status: "active" | "disabled") =>
    start(async () => {
      const res = await updateUser({
        userId: user.id,
        role,
        status,
        projectIds,
      });
      if (res.ok) {
        setOpen(false);
        setConfirm(false);
        setError("");
      } else {
        setConfirm(false);
        setError(ERROR[res.error] ?? ERROR.failed);
        if (status === "disabled") setOpen(true);
      }
    });

  return (
    <div className="flex items-center justify-end gap-1">
      <IconButton
        kind="edit"
        label={`แก้ไขระดับและโครงการของ ${nameOf(user)}`}
        onClick={() => setOpen(true)}
      />
      <ActionMenu
        label={`ตัวเลือกของ ${nameOf(user)}`}
        items={[
          {
            key: "edit",
            label:
              user.status === "active" ? "แก้ไขระดับและโครงการ" : "แก้ไขและเปิดสิทธิ์",
            icon: <EditIcon />,
            onClick: () => setOpen(true),
            primary: true,
          },
          {
            key: "move",
            label: "ย้ายลีดทั้งหมด",
            icon: <TeamIcon />,
            onClick: () => setTransfer(true),
          },
          ...(user.status === "active" && !isMe
            ? [
                {
                  key: "disable",
                  label: "ปิดสิทธิ์ผู้ใช้",
                  icon: <DeleteIcon />,
                  onClick: () => setConfirm(true),
                  danger: true,
                  dividerBefore: true,
                },
              ]
            : []),
        ]}
      />

      <Sheet
        open={open && !confirm}
        onClose={() => setOpen(false)}
        title={nameOf(user)}
      >
        <div className="flex flex-col gap-4">
          {error && <Notice tone="danger">{error}</Notice>}
          <Field label="ระดับผู้ใช้">
            <FormSelect
              options={ROLE_OPTIONS}
              value={role}
              onChange={(v) => setRole(v as Role)}
            />
          </Field>
          {role !== "admin" && (
            <ProjectChecks
              projects={projects}
              value={projectIds}
              onChange={setProjectIds}
            />
          )}
          {role === "executive" && (
            <p className="text-sm text-ink-soft">
              ผู้บริหารที่ไม่ได้เลือกโครงการ จะเห็นทุกโครงการ
            </p>
          )}
          <Button full disabled={busy} onClick={() => save("active")}>
            {busy
              ? "กำลังบันทึก"
              : user.status === "active"
                ? "บันทึก"
                : "บันทึกและเปิดสิทธิ์"}
          </Button>
        </div>
      </Sheet>

      <ConfirmCard
        open={confirm}
        onClose={() => setConfirm(false)}
        onConfirm={() => save("disabled")}
        title="ปิดสิทธิ์ผู้ใช้"
        rows={[
          { label: "ผู้ใช้", value: nameOf(user) },
          { label: "อีเมล", value: user.email },
          { label: "ระดับ", value: ROLE_LABEL[user.role] },
        ]}
        consequence="ผู้ใช้คนนี้จะเข้าระบบไม่ได้ทันที ข้อมูลและลูกค้าที่ถืออยู่ไม่หาย แอดมินเปิดสิทธิ์คืนได้ภายหลัง"
        confirmLabel={`ยืนยันปิดสิทธิ์ ${nameOf(user)}`}
        danger
        busy={busy}
      />

      <TransferLeads
        user={user}
        targets={targets.filter(
          (t) => t.id !== user.id && t.status === "active",
        )}
        open={transfer}
        onClose={() => setTransfer(false)}
      />
    </div>
  );
}

const nameOf = (u: UserRow) => u.full_name || u.email;

/** "Move all leads": pick who takes over, confirm with the count, then run transfer_leads. */
function TransferLeads({
  user,
  targets,
  open,
  onClose,
}: {
  user: UserRow;
  targets: UserRow[];
  open: boolean;
  onClose: () => void;
}) {
  const [toId, setToId] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [msg, setMsg] = useState<{
    tone: "ok" | "warn" | "danger";
    text: string;
  } | null>(null);
  const [busy, start] = useTransition();
  const target = targets.find((t) => t.id === toId);

  const close = () => {
    setCount(null);
    setToId("");
    setMsg(null);
    onClose();
  };

  const next = () =>
    start(async () => {
      const res = await countOwnedLeads(user.id);
      if (!res.ok)
        return setMsg({ tone: "danger", text: "นับจำนวนลีดไม่สำเร็จ ลองใหม่อีกครั้ง" });
      if (res.count === 0)
        return setMsg({ tone: "warn", text: `${nameOf(user)} ไม่มีลีดให้ย้าย` });
      setMsg(null);
      setCount(res.count);
    });

  const confirm = () =>
    start(async () => {
      const res = await transferAllLeads({ fromId: user.id, toId });
      setCount(null);
      setMsg(
        res.ok
          ? {
              tone: "ok",
              text: `ย้ายแล้ว ${res.moved} ราย ไปให้ ${target ? nameOf(target) : ""}`,
            }
          : { tone: "danger", text: "ย้ายลีดไม่สำเร็จ ผู้รับต้องเป็นผู้ใช้ที่เปิดสิทธิ์อยู่" },
      );
    });

  return (
    <>
      <Sheet
        open={open && count === null}
        onClose={close}
        title={`ย้ายลีดทั้งหมดของ ${nameOf(user)}`}
      >
        <div className="flex flex-col gap-4">
          {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
          {targets.length === 0 ? (
            <p className="text-sm text-ink-soft">ยังไม่มีผู้ใช้คนอื่นที่เปิดสิทธิ์อยู่ให้รับลีด</p>
          ) : (
            <Field
              label="ย้ายไปให้"
              hint="ลีดทุกขั้นของคนนี้จะเป็นของผู้รับ รวมลูกค้าที่ปิดการขายแล้ว"
            >
              <FormSelect
                options={targets.map((t) => ({
                  id: t.id,
                  label: nameOf(t),
                  subtitle: ROLE_LABEL[t.role],
                  icon: <Avatar name={nameOf(t)} url={t.avatar_url} size="sm" />,
                }))}
                value={toId}
                onChange={setToId}
                placeholder="เลือกผู้รับ"
                searchPlaceholder="ค้นหาชื่อ"
              />
            </Field>
          )}
          <Button full disabled={!toId || busy} onClick={next}>
            {busy
              ? "กำลังนับลีด"
              : target
                ? `ถัดไป: ย้ายให้ ${nameOf(target)}`
                : "ถัดไป"}
          </Button>
        </div>
      </Sheet>

      <ConfirmCard
        open={open && count !== null}
        onClose={() => setCount(null)}
        onConfirm={confirm}
        title={`ย้ายลีด ${count ?? 0} รายของ ${nameOf(user)} ไปให้ ${target ? nameOf(target) : ""}`}
        rows={[
          { label: "จาก", value: nameOf(user) },
          {
            label: "ไปให้",
            value: target
              ? `${nameOf(target)} (${ROLE_LABEL[target.role]})`
              : "-",
          },
          { label: "จำนวนลีด", value: `${count ?? 0} ราย` },
        ]}
        consequence="ลีดทั้งหมดจะเป็นของผู้รับทันที ผู้รับได้แจ้งเตือนลีดใหม่ ถ้าต้องการย้ายกลับต้องทำซ้ำจากอีกฝั่ง ซึ่งจะย้ายลีดเดิมของผู้รับไปด้วย"
        confirmLabel={`ยืนยันย้ายลีด ${count ?? 0} ราย`}
        busy={busy}
      />
    </>
  );
}

/** Creates a single-use invite link to copy and send over LINE. */
/** "เชิญพนักงาน" button (top right of the page) that opens the invite form in a modal. */
export function InviteButton({ projects }: { projects: ProjectOption[] }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Button icon="add" onClick={() => setOpen(true)}>
        เชิญพนักงาน
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="เชิญพนักงาน"
        size="md"
        mobileSheet
      >
        {/* key: a fresh form (and no old link) every time it opens */}
        {open && <InviteForm projects={projects} bare />}
      </Modal>
    </>
  );
}

export function InviteForm({
  projects,
  bare = false,
}: {
  projects: ProjectOption[];
  bare?: boolean;
}) {
  const [role, setRole] = useState<Role>("sales");
  const [projectIds, setProjectIds] = useState<string[]>([]);
  const [days, setDays] = useState(7);
  const [link, setLink] = useState("");
  const [error, setError] = useState(false);
  const [busy, start] = useTransition();

  const create = () =>
    start(async () => {
      const res = await createInvite({
        role,
        projectIds: role === "admin" ? [] : projectIds,
        days,
      });
      setError(!res.ok);
      if (res.ok) setLink(`${window.location.origin}/invite/${res.token}`);
    });

  const Box = bare ? "div" : Card;
  return (
    <Box className="flex flex-col gap-4">
      {!bare && <h2 className="text-lg font-semibold">เชิญพนักงาน</h2>}
      {error && <Notice tone="danger">สร้างลิงก์ไม่สำเร็จ ลองใหม่อีกครั้ง</Notice>}
      <Field label="ระดับผู้ใช้">
        <FormSelect
          options={ROLE_OPTIONS}
          value={role}
          onChange={(v) => setRole(v as Role)}
        />
      </Field>
      {role !== "admin" && (
        <ProjectChecks
          projects={projects}
          value={projectIds}
          onChange={setProjectIds}
        />
      )}
      <Field label="ลิงก์ใช้ได้กี่วัน" hint="ลิงก์ใช้สมัครได้ครั้งเดียว">
        <FormSelect
          options={[1, 3, 7, 30].map((d) => ({
            id: String(d),
            label: `${d} วัน`,
          }))}
          value={String(days)}
          onChange={(v) => setDays(Number(v))}
        />
      </Field>
      <Button full disabled={busy} onClick={create}>
        {busy ? "กำลังสร้างลิงก์" : `สร้างลิงก์เชิญ${ROLE_LABEL[role]}`}
      </Button>
      {link && (
        <CopyField
          value={link}
          label="ลิงก์เชิญ"
          hint="คัดลอกแล้วส่งทาง LINE ได้เลย ใช้สมัครได้ครั้งเดียว"
        />
      )}
    </Box>
  );
}
