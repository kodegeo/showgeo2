import { useState } from "react";
import { X } from "lucide-react";
import type { EventTicketType, TicketAccessLevel } from "../../../packages/shared/types/event.types";

// ^ adjust import path to wherever you put TicketType/TicketAccessLevel

interface TicketTypeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (ticket: EventTicketType) => void;
}

export function TicketTypeModal({ isOpen, onClose, onSave }: TicketTypeModalProps) {
  const [form, setForm] = useState<{
    name: string;
    price: number;
    quantity: number;
    accessLevel: TicketAccessLevel;
  }>({
    name: "",
    price: 0,
    quantity: 100,
    accessLevel: "GENERAL",
  });

  if (!isOpen) return null;

  function submit() {
    const ticket: EventTicketType = {
      name: form.name.trim() || "General Admission",
      price: Number.isFinite(form.price) ? form.price : 0,
      quantity: Number.isFinite(form.quantity) ? form.quantity : 0,
      accessLevel: form.accessLevel,
      currency: "USD",
    };

    onSave(ticket);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center">
      <div className="bg-[#0B0B0B] border border-white/10 rounded-lg w-full max-w-md p-6 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-semibold text-white">Add Ticket Type</h2>
          <button onClick={onClose}>
            <X className="w-5 h-5 text-white/60 hover:text-white" />
          </button>
        </div>

        <input
          className="w-full bg-black/40 border border-white/10 p-2 rounded text-white"
          placeholder="Ticket name (e.g. General Admission)"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
        />

        <input
          type="number"
          className="w-full bg-black/40 border border-white/10 p-2 rounded text-white"
          placeholder="Price (0 = free)"
          value={form.price}
          onChange={(e) => setForm({ ...form, price: Number(e.target.value) })}
        />

        <input
          type="number"
          className="w-full bg-black/40 border border-white/10 p-2 rounded text-white"
          placeholder="Quantity available"
          value={form.quantity}
          onChange={(e) => setForm({ ...form, quantity: Number(e.target.value) })}
        />

        <select
          className="w-full bg-black/40 border border-white/10 p-2 rounded text-white"
          value={form.accessLevel}
          onChange={(e) =>
            setForm({ ...form, accessLevel: e.target.value as TicketAccessLevel })
          }
        >
          <option value="GENERAL">General Access</option>
          <option value="VIP">VIP Access</option>
        </select>

        <div className="flex justify-end gap-3 pt-4">
          <button onClick={onClose} className="px-4 py-2 text-white/60 hover:text-white">
            Cancel
          </button>
          <button
            onClick={submit}
            className="px-4 py-2 bg-[#CD000E] text-white rounded hover:bg-[#860005]"
          >
            Save Ticket
          </button>
        </div>
      </div>
    </div>
  );
}
