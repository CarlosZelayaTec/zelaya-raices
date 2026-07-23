import type {
  OrganizationRole,
  StaffRole,
} from "@/shared/lib/auth";
import type { Database } from "@/shared/lib/supabase/database.types";

type PublicationStatus =
  Database["public"]["Enums"]["publication_status"];
type AvailabilityStatus =
  Database["public"]["Enums"]["availability_status"];

export const staffRoleLabels: Record<StaffRole, string> = {
  super_admin: "Propietario de la plataforma",
  admin: "Administrador",
  moderator: "Moderador",
};

export const organizationRoleLabels: Record<OrganizationRole, string> = {
  agency_owner: "Dueño de agencia",
  manager: "Gerente",
  agent: "Agente inmobiliario",
  property_owner: "Propietario",
  editor: "Editor",
  viewer: "Consulta",
};

export const publicationStatusLabels: Record<PublicationStatus, string> = {
  draft: "Borrador",
  pending_review: "En revisión",
  published: "Publicada",
  rejected: "Rechazada",
  archived: "Archivada",
};

export const availabilityStatusLabels: Record<AvailabilityStatus, string> = {
  available: "Disponible",
  reserved: "Reservada",
  sold: "Vendida",
  rented: "Alquilada",
  unavailable: "No disponible",
};

export function publicationTone(status: PublicationStatus) {
  if (status === "published") return "success";
  if (status === "pending_review") return "warning";
  if (status === "rejected") return "danger";
  if (status === "draft") return "info";
  return "neutral";
}

