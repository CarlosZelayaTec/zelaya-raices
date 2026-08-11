import type { Database } from "@/shared/lib/supabase/database.types";

export type PropertyType = Database["public"]["Enums"]["property_type"];
export type PropertyFormVariant = "residential" | "land" | "commercial";

export const PROPERTY_TYPE_OPTIONS = [
  {
    value: "house",
    filterValue: "casa",
    label: "Casa",
    description: "Viviendas independientes y residencias.",
    icon: "⌂",
    formVariant: "residential",
    titlePlaceholder: "Casa familiar de 3 habitaciones cerca del centro",
  },
  {
    value: "apartment",
    filterValue: "apartamento",
    label: "Apartamento",
    description: "Apartamentos y unidades en edificios.",
    icon: "▥",
    formVariant: "residential",
    titlePlaceholder: "Apartamento moderno de 2 habitaciones en zona céntrica",
  },
  {
    value: "land",
    filterValue: "terreno",
    label: "Terreno",
    description: "Lotes, solares y terrenos para desarrollo.",
    icon: "▱",
    formVariant: "land",
    titlePlaceholder: "Terreno residencial de 850 m² en zona tranquila",
  },
  {
    value: "villa",
    filterValue: "villa",
    label: "Villa",
    description: "Villas residenciales, vacacionales o de descanso.",
    icon: "⌂",
    formVariant: "residential",
    titlePlaceholder: "Villa de 4 habitaciones con áreas sociales",
  },
  {
    value: "condominium",
    filterValue: "condominio",
    label: "Condominio",
    description: "Unidades residenciales en condominio.",
    icon: "⌂",
    formVariant: "residential",
    titlePlaceholder: "Condominio de 3 habitaciones con seguridad privada",
  },
  {
    value: "commercial",
    filterValue: "local comercial",
    label: "Local comercial",
    description: "Espacios para comercio o servicios.",
    icon: "▣",
    formVariant: "commercial",
    titlePlaceholder: "Local comercial con estacionamiento en avenida principal",
  },
  {
    value: "office",
    filterValue: "oficina",
    label: "Oficina",
    description: "Oficinas y espacios profesionales.",
    icon: "▤",
    formVariant: "commercial",
    titlePlaceholder: "Oficina equipada en centro corporativo",
  },
  {
    value: "warehouse",
    filterValue: "bodega",
    label: "Bodega",
    description: "Bodegas y espacios logísticos.",
    icon: "▰",
    formVariant: "commercial",
    titlePlaceholder: "Bodega industrial con acceso para carga pesada",
  },
  {
    value: "farm",
    filterValue: "finca",
    label: "Finca",
    description: "Fincas, parcelas y propiedades de uso rural.",
    icon: "♧",
    formVariant: "land",
    titlePlaceholder: "Finca productiva con acceso por carretera",
  },
  {
    value: "building",
    filterValue: "edificio",
    label: "Edificio",
    description: "Edificios completos e inmuebles mixtos.",
    icon: "▥",
    formVariant: "commercial",
    titlePlaceholder: "Edificio de varios niveles en zona comercial",
  },
] as const satisfies ReadonlyArray<{
  value: PropertyType;
  filterValue: string;
  label: string;
  description: string;
  icon: string;
  formVariant: PropertyFormVariant;
  titlePlaceholder: string;
}>;

export function getPropertyTypeOption(propertyType: PropertyType) {
  return PROPERTY_TYPE_OPTIONS.find(({ value }) => value === propertyType);
}

export function getPropertyTypeLabel(propertyType: PropertyType) {
  return getPropertyTypeOption(propertyType)?.label ?? propertyType;
}

export function getPropertyTypeInitials(propertyType: PropertyType) {
  return getPropertyTypeLabel(propertyType)
    .split(/\s+/)
    .map((word) => word[0])
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("es-HN");
}

export function isLandPropertyType(propertyType: PropertyType) {
  return getPropertyTypeOption(propertyType)?.formVariant === "land";
}

export function isResidentialPropertyType(propertyType: PropertyType) {
  return getPropertyTypeOption(propertyType)?.formVariant === "residential";
}
