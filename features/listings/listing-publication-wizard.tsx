"use client";

import {
  type ChangeEvent,
  type DragEvent,
  type FormEvent,
  type ReactNode,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";

import { createSupabaseBrowserClient } from "@/shared/lib/supabase/client";
import type { Database } from "@/shared/lib/supabase/database.types";

import { LocationMapPicker } from "./location-map-picker";
import styles from "./listing-publication-wizard.module.css";
import type { ListingPublicationWizardProps } from "./types";

type ListingUpdate =
  Database["public"]["Tables"]["listings"]["Update"];
type ListingRow = Database["public"]["Tables"]["listings"]["Row"];
type MediaRow = Database["public"]["Tables"]["listing_media"]["Row"];
type PropertyType = "land" | "house" | "apartment";
type OperationType = "sale" | "rent";
type AreaUnit = Database["public"]["Enums"]["area_unit"];
type CurrencyCode = Database["public"]["Enums"]["currency_code"];
type PricePeriod = Database["public"]["Enums"]["price_period"];
type LocationPrecision =
  Database["public"]["Enums"]["location_precision"];

type WizardForm = {
  organizationId: string;
  propertyType: PropertyType;
  operationType: OperationType;
  title: string;
  description: string;
  priceAmount: string;
  priceOnRequest: boolean;
  currencyCode: CurrencyCode;
  pricePeriod: PricePeriod;
  bedrooms: string;
  bathrooms: string;
  parkingSpaces: string;
  landArea: string;
  landAreaUnit: AreaUnit;
  constructionArea: string;
  constructionAreaUnit: AreaUnit;
  yearBuilt: string;
  department: string;
  municipality: string;
  city: string;
  zone: string;
  visibleAddress: string;
  latitude: string;
  longitude: string;
  precision: LocationPrecision;
};

type FormField = keyof WizardForm | "media";
type FormErrors = Partial<Record<FormField, string>>;
type BusyAction = "saving" | "submitting" | null;
type MediaStatus =
  | "pending"
  | "uploading"
  | "uploaded"
  | "removing"
  | "error";

type DraftReference = {
  id: string;
  slug: string;
  publicationStatus: "draft" | "pending_review";
  version: number;
};

type MediaItem = {
  localId: string;
  file: File;
  kind: "image" | "video";
  previewUrl: string;
  status: MediaStatus;
  error?: string;
  sourcePath?: string;
  recordId?: string;
  isPrimary?: boolean;
};

type RpcError = {
  code?: string;
  message: string;
  details?: string;
  hint?: string;
};

type RpcInvoker = (
  functionName: string,
  args?: Record<string, unknown>,
) => PromiseLike<{ data: unknown; error: RpcError | null }>;

const STEPS = [
  {
    shortLabel: "Tipo",
    title: "¿Qué propiedad quieres publicar?",
    description: "Selecciona la cuenta, el inmueble y el tipo de operación.",
  },
  {
    shortLabel: "Detalles",
    title: "Describe la propiedad",
    description: "Agrega precio, áreas y características principales.",
  },
  {
    shortLabel: "Ubicación",
    title: "Ubica la propiedad",
    description:
      "La ubicación pública puede ser aproximada para proteger la privacidad.",
  },
  {
    shortLabel: "Revisión",
    title: "Multimedia y revisión",
    description: "Sube el material y confirma la información antes de enviarla.",
  },
] as const;

const PROPERTY_OPTIONS: ReadonlyArray<{
  value: PropertyType;
  label: string;
  description: string;
  icon: string;
}> = [
  {
    value: "land",
    label: "Terreno",
    description: "Lotes, solares y terrenos para desarrollo.",
    icon: "▱",
  },
  {
    value: "house",
    label: "Casa",
    description: "Viviendas independientes y residencias.",
    icon: "⌂",
  },
  {
    value: "apartment",
    label: "Apartamento",
    description: "Apartamentos y unidades en edificios.",
    icon: "▥",
  },
];

const OPERATION_OPTIONS: ReadonlyArray<{
  value: OperationType;
  label: string;
  description: string;
}> = [
  {
    value: "sale",
    label: "Venta",
    description: "Precio total de compra.",
  },
  {
    value: "rent",
    label: "Alquiler",
    description: "Renta periódica, inicialmente mensual.",
  },
];

const ALLOWED_MEDIA_TYPES = new Map<string, string>([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
  ["image/avif", "avif"],
  ["video/mp4", "mp4"],
  ["video/webm", "webm"],
  ["video/quicktime", "mov"],
]);

const MAX_MEDIA_ITEMS = 12;
const MAX_FILE_BYTES = 50 * 1024 * 1024;
const MAX_FILE_LABEL = "50 MB";
const HONDURAS_BOUNDS = {
  east: -82.5,
  north: 17.5,
  south: 12.8,
  west: -89.5,
} as const;

const DEFAULT_FORM: WizardForm = {
  organizationId: "",
  propertyType: "house",
  operationType: "sale",
  title: "",
  description: "",
  priceAmount: "",
  priceOnRequest: false,
  currencyCode: "HNL",
  pricePeriod: "total",
  bedrooms: "",
  bathrooms: "",
  parkingSpaces: "",
  landArea: "",
  landAreaUnit: "m2",
  constructionArea: "",
  constructionAreaUnit: "m2",
  yearBuilt: "",
  department: "",
  municipality: "",
  city: "",
  zone: "",
  visibleAddress: "",
  latitude: "",
  longitude: "",
  precision: "approximate",
};

const FIELD_STEP: Record<FormField, number> = {
  organizationId: 0,
  propertyType: 0,
  operationType: 0,
  title: 1,
  description: 1,
  priceAmount: 1,
  priceOnRequest: 1,
  currencyCode: 1,
  pricePeriod: 1,
  bedrooms: 1,
  bathrooms: 1,
  parkingSpaces: 1,
  landArea: 1,
  landAreaUnit: 1,
  constructionArea: 1,
  constructionAreaUnit: 1,
  yearBuilt: 1,
  department: 2,
  municipality: 2,
  city: 2,
  zone: 2,
  visibleAddress: 2,
  latitude: 2,
  longitude: 2,
  precision: 2,
  media: 3,
};

function toNullableNumber(value: string) {
  const normalized = value.trim();
  if (!normalized) return null;

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : null;
}

function slugify(value: string) {
  const normalized = value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 145);

  return normalized || "propiedad";
}

function createDraftSlug(title: string) {
  return `${slugify(title)}-${crypto.randomUUID().slice(0, 8)}`;
}

function getRpcRow<T>(data: unknown, label: string) {
  const row = Array.isArray(data) ? data[0] : data;

  if (!row || typeof row !== "object") {
    throw new Error(`El servidor no devolvió ${label}.`);
  }

  return row as T;
}

function getRpcRows<T>(data: unknown, label: string) {
  if (!Array.isArray(data)) {
    throw new Error(`El servidor no devolvió ${label}.`);
  }

  return data as T[];
}

function presentError(error: unknown) {
  if (error instanceof Error && error.message) return error.message;

  if (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    typeof error.message === "string"
  ) {
    return error.message;
  }

  return "Ocurrió un error inesperado. Inténtalo de nuevo.";
}

function classNames(...values: Array<string | false | null | undefined>) {
  return values.filter(Boolean).join(" ");
}

function FieldError({
  children,
  id,
}: {
  children?: ReactNode;
  id: string;
}) {
  if (!children) return null;

  return (
    <span className={styles.fieldError} id={id}>
      {children}
    </span>
  );
}

export function ListingPublicationWizard({
  organizations,
  initialOrganizationId,
  className,
  onDraftSaved,
  onSubmitted,
}: ListingPublicationWizardProps) {
  const instanceId = useId().replaceAll(":", "");
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const previewUrlsRef = useRef(new Set<string>());

  const preferredOrganizationId =
    initialOrganizationId &&
    organizations.some(({ id }) => id === initialOrganizationId)
      ? initialOrganizationId
      : organizations[0]?.id ?? "";

  const [step, setStep] = useState(0);
  const [furthestStep, setFurthestStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(() => ({
    ...DEFAULT_FORM,
    organizationId: preferredOrganizationId,
  }));
  const [errors, setErrors] = useState<FormErrors>({});
  const [busyAction, setBusyAction] = useState<BusyAction>(null);
  const [statusMessage, setStatusMessage] = useState("");
  const [globalError, setGlobalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [draft, setDraft] = useState<DraftReference | null>(null);
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [draggedMediaId, setDraggedMediaId] = useState<string | null>(null);
  const [dragOverMediaId, setDragOverMediaId] = useState<string | null>(null);
  const [removingMediaId, setRemovingMediaId] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [isDirty, setIsDirty] = useState(false);

  const isBusy = busyAction !== null || removingMediaId !== null;
  const isSubmitted = draft?.publicationStatus === "pending_review";
  const selectedOrganization = organizations.find(
    ({ id }) => id === form.organizationId,
  );
  const uploadedMediaCount = mediaItems.filter(
    ({ status }) => status === "uploaded",
  ).length;
  const pendingMediaCount = mediaItems.filter(
    ({ status }) => status !== "uploaded",
  ).length;
  const primaryMediaLocalId = mediaItems.find(
    ({ kind }) => kind === "image",
  )?.localId;

  useEffect(() => {
    headingRef.current?.focus();
  }, [step]);

  useEffect(
    () => () => {
      previewUrlsRef.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrlsRef.current.clear();
    },
    [],
  );

  function fieldId(field: FormField) {
    return `${instanceId}-${field}`;
  }

  function fieldErrorId(field: FormField) {
    return `${fieldId(field)}-error`;
  }

  function updateField<K extends keyof WizardForm>(
    key: K,
    value: WizardForm[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
    setGlobalError("");
    setSuccessMessage("");
    setIsDirty(true);
  }

  function updateMapCoordinates(latitude: string, longitude: string) {
    setForm((current) => ({ ...current, latitude, longitude }));
    setErrors((current) => ({
      ...current,
      latitude: undefined,
      longitude: undefined,
    }));
    setGlobalError("");
    setSuccessMessage("");
    setIsDirty(true);
  }

  function applyMapLocationDetails(
    details: Partial<
      Pick<
        WizardForm,
        "city" | "department" | "municipality" | "zone"
      >
    >,
  ) {
    setForm((current) => ({
      ...current,
      city: details.city?.trim() || current.city,
      department: details.department?.trim() || current.department,
      municipality: details.municipality?.trim() || current.municipality,
      zone: details.zone?.trim() || current.zone,
    }));
    setErrors((current) => ({
      ...current,
      department: undefined,
      municipality: undefined,
    }));
    setGlobalError("");
    setSuccessMessage("");
    setIsDirty(true);
  }

  function selectPropertyType(value: PropertyType) {
    updateField("propertyType", value);

    if (value === "land") {
      setForm((current) => ({
        ...current,
        bedrooms: "",
        bathrooms: "",
        parkingSpaces: "",
        constructionArea: "",
        yearBuilt: "",
      }));
    }
  }

  function selectOperationType(value: OperationType) {
    setForm((current) => ({
      ...current,
      operationType: value,
      pricePeriod: value === "sale" ? "total" : "monthly",
    }));
    setErrors((current) => ({
      ...current,
      operationType: undefined,
      pricePeriod: undefined,
    }));
    setGlobalError("");
    setSuccessMessage("");
    setIsDirty(true);
  }

  function validateStep(targetStep: number, requireMedia = false) {
    const nextErrors: FormErrors = {};
    const currentYear = new Date().getFullYear();

    if (targetStep >= 0) {
      if (!form.organizationId) {
        nextErrors.organizationId =
          "Selecciona la cuenta que publicará esta propiedad.";
      }
    }

    if (targetStep >= 1) {
      const title = form.title.trim();
      const description = form.description.trim();
      const price = toNullableNumber(form.priceAmount);
      const landArea = toNullableNumber(form.landArea);
      const constructionArea = toNullableNumber(form.constructionArea);
      const bedrooms = toNullableNumber(form.bedrooms);
      const bathrooms = toNullableNumber(form.bathrooms);
      const parking = toNullableNumber(form.parkingSpaces);
      const yearBuilt = toNullableNumber(form.yearBuilt);

      if (title.length < 10 || title.length > 180) {
        nextErrors.title = "Usa entre 10 y 180 caracteres.";
      }

      if (description.length < 40 || description.length > 20_000) {
        nextErrors.description = "Usa entre 40 y 20,000 caracteres.";
      }

      if (!form.priceOnRequest && (price === null || price < 0)) {
        nextErrors.priceAmount = "Ingresa un precio válido.";
      }

      if (form.propertyType === "land") {
        if (landArea === null || landArea <= 0) {
          nextErrors.landArea = "El área del terreno es obligatoria.";
        }
      } else if (constructionArea === null || constructionArea <= 0) {
        nextErrors.constructionArea =
          "El área de construcción es obligatoria.";
      }

      if (landArea !== null && landArea <= 0) {
        nextErrors.landArea = "El área debe ser mayor que cero.";
      }

      if (constructionArea !== null && constructionArea <= 0) {
        nextErrors.constructionArea = "El área debe ser mayor que cero.";
      }

      if (bedrooms !== null && (!Number.isInteger(bedrooms) || bedrooms < 0)) {
        nextErrors.bedrooms = "Usa un número entero igual o mayor que cero.";
      }

      if (bathrooms !== null && bathrooms < 0) {
        nextErrors.bathrooms = "Usa un número igual o mayor que cero.";
      }

      if (parking !== null && (!Number.isInteger(parking) || parking < 0)) {
        nextErrors.parkingSpaces =
          "Usa un número entero igual o mayor que cero.";
      }

      if (
        yearBuilt !== null &&
        (!Number.isInteger(yearBuilt) ||
          yearBuilt < 1800 ||
          yearBuilt > currentYear)
      ) {
        nextErrors.yearBuilt = `Usa un año entre 1800 y ${currentYear}.`;
      }
    }

    if (targetStep >= 2) {
      const latitude = toNullableNumber(form.latitude);
      const longitude = toNullableNumber(form.longitude);

      if (form.department.trim().length < 2) {
        nextErrors.department = "Ingresa el departamento.";
      }

      if (form.municipality.trim().length < 2) {
        nextErrors.municipality = "Ingresa el municipio.";
      }

      if (
        latitude === null ||
        latitude < HONDURAS_BOUNDS.south ||
        latitude > HONDURAS_BOUNDS.north
      ) {
        nextErrors.latitude = "Selecciona una latitud ubicada en Honduras.";
      }

      if (
        longitude === null ||
        longitude < HONDURAS_BOUNDS.west ||
        longitude > HONDURAS_BOUNDS.east
      ) {
        nextErrors.longitude = "Selecciona una longitud ubicada en Honduras.";
      }
    }

    if (targetStep >= 3 && requireMedia) {
      const hasImage = mediaItems.some(
        ({ kind, status }) =>
          kind === "image" && (status === "pending" || status === "uploaded"),
      );

      if (!hasImage) {
        nextErrors.media =
          "Agrega al menos una fotografía antes de enviar a revisión.";
      }
    }

    return nextErrors;
  }

  function focusFirstError(nextErrors: FormErrors) {
    const firstField = Object.keys(nextErrors)[0] as FormField | undefined;
    if (!firstField) return;

    const targetStep = FIELD_STEP[firstField];
    setStep(targetStep);
    setFurthestStep((current) => Math.max(current, targetStep));

    window.setTimeout(() => {
      document.getElementById(fieldId(firstField))?.focus();
    }, 0);
  }

  function applyValidation(targetStep: number, requireMedia = false) {
    const nextErrors = validateStep(targetStep, requireMedia);
    setErrors(nextErrors);

    if (Object.keys(nextErrors).length > 0) {
      focusFirstError(nextErrors);
      return false;
    }

    return true;
  }

  function goToStep(nextStep: number) {
    if (isBusy || nextStep < 0 || nextStep > STEPS.length - 1) return;

    if (nextStep > step && !applyValidation(step)) return;

    setStep(nextStep);
    setFurthestStep((current) => Math.max(current, nextStep));
    setGlobalError("");
  }

  function handleFormSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (step < STEPS.length - 1) {
      goToStep(step + 1);
      return;
    }

    void handleSubmitForReview();
  }

  function buildCreateListingArgs(slug: string) {
    const isLand = form.propertyType === "land";
    const priceAmount = form.priceOnRequest
      ? null
      : toNullableNumber(form.priceAmount);
    const landArea = toNullableNumber(form.landArea);
    const constructionArea = isLand
      ? null
      : toNullableNumber(form.constructionArea);

    return {
      p_organization_id: form.organizationId,
      p_title: form.title.trim(),
      p_slug: slug,
      p_description: form.description.trim(),
      p_operation_type: form.operationType,
      p_property_type: form.propertyType,
      p_price_amount: priceAmount,
      p_price_on_request: form.priceOnRequest,
      p_currency_code: form.currencyCode,
      p_price_period:
        form.operationType === "sale" ? "total" : form.pricePeriod,
      p_bedrooms: isLand ? null : toNullableNumber(form.bedrooms),
      p_bathrooms: isLand ? null : toNullableNumber(form.bathrooms),
      p_parking_spaces: isLand
        ? null
        : toNullableNumber(form.parkingSpaces),
      p_land_area: landArea,
      p_land_area_unit: landArea === null ? null : form.landAreaUnit,
      p_construction_area: constructionArea,
      p_construction_area_unit:
        constructionArea === null ? null : form.constructionAreaUnit,
      p_year_built: isLand ? null : toNullableNumber(form.yearBuilt),
    };
  }

  function buildListingUpdate(): ListingUpdate {
    const isLand = form.propertyType === "land";
    const landArea = toNullableNumber(form.landArea);
    const constructionArea = isLand
      ? null
      : toNullableNumber(form.constructionArea);

    return {
      title: form.title.trim(),
      slug: draft?.slug,
      description: form.description.trim(),
      operation_type: form.operationType,
      property_type: form.propertyType,
      availability_status: "available",
      price_amount: form.priceOnRequest
        ? null
        : toNullableNumber(form.priceAmount),
      price_on_request: form.priceOnRequest,
      currency_code: form.currencyCode,
      price_period:
        form.operationType === "sale" ? "total" : form.pricePeriod,
      bedrooms: isLand ? null : toNullableNumber(form.bedrooms),
      bathrooms: isLand ? null : toNullableNumber(form.bathrooms),
      parking_spaces: isLand
        ? null
        : toNullableNumber(form.parkingSpaces),
      land_area: landArea,
      land_area_unit: landArea === null ? null : form.landAreaUnit,
      construction_area: constructionArea,
      construction_area_unit:
        constructionArea === null ? null : form.constructionAreaUnit,
      year_built: isLand ? null : toNullableNumber(form.yearBuilt),
    };
  }

  function buildLocationArgs(listingId: string) {
    return {
      p_city: form.city.trim() || undefined,
      p_department: form.department.trim(),
      p_exact_latitude: Number(form.latitude),
      p_exact_longitude: Number(form.longitude),
      p_listing_id: listingId,
      p_municipality: form.municipality.trim(),
      p_organization_id: form.organizationId,
      p_precision: form.precision,
      p_private_address: form.visibleAddress.trim() || undefined,
      p_zone: form.zone.trim() || undefined,
    };
  }

  async function saveDraftLocation(listingId: string) {
    return invokePublicRpc<{ saved_listing_id: string }>(
      "save_listing_location",
      buildLocationArgs(listingId),
      "la ubicación protegida",
    );
  }

  async function invokePublicRpc<T>(
    functionName: string,
    args: Record<string, unknown>,
    resultLabel: string,
  ) {
    const invokeRpc = supabase.rpc.bind(supabase) as unknown as RpcInvoker;
    const { data, error } = await invokeRpc(functionName, args);

    if (error) throw error;
    return getRpcRow<T>(data, resultLabel);
  }

  async function invokePublicRpcRows<T>(
    functionName: string,
    args: Record<string, unknown>,
    resultLabel: string,
  ) {
    const invokeRpc = supabase.rpc.bind(supabase) as unknown as RpcInvoker;
    const { data, error } = await invokeRpc(functionName, args);

    if (error) throw error;
    return getRpcRows<T>(data, resultLabel);
  }

  async function createDraft() {
    const slug = createDraftSlug(form.title);
    const insertedListing = await invokePublicRpc<ListingRow>(
      "create_listing_draft",
      buildCreateListingArgs(slug),
      "el nuevo borrador",
    );

    if (insertedListing.publication_status !== "draft") {
      throw new Error("El servidor creó el anuncio en un estado inesperado.");
    }

    try {
      await saveDraftLocation(insertedListing.id);
    } catch {
      await supabase
        .from("listings")
        .delete()
        .eq("id", insertedListing.id)
        .eq("publication_status", "draft");

      throw new Error(
        "No se pudo guardar la ubicación. El borrador no fue creado.",
      );
    }

    const reference: DraftReference = {
      id: insertedListing.id,
      slug: insertedListing.slug,
      publicationStatus: "draft",
      version: insertedListing.version,
    };

    setDraft(reference);
    return reference;
  }

  async function updateDraft(currentDraft: DraftReference) {
    const { data: updatedListing, error: listingError } = await supabase
      .from("listings")
      .update(buildListingUpdate())
      .eq("id", currentDraft.id)
      .eq("organization_id", form.organizationId)
      .eq("publication_status", "draft")
      .select("id, slug, publication_status, version")
      .single();

    if (listingError || !updatedListing) {
      throw listingError ?? new Error("No se pudo actualizar el borrador.");
    }

    await saveDraftLocation(currentDraft.id);

    if (updatedListing.publication_status !== "draft") {
      throw new Error("El anuncio ya no está disponible como borrador.");
    }

    const reference: DraftReference = {
      id: updatedListing.id,
      slug: updatedListing.slug,
      publicationStatus: "draft",
      version: updatedListing.version,
    };
    setDraft(reference);
    return reference;
  }

  async function persistDraft() {
    const reference = draft
      ? await updateDraft(draft)
      : await createDraft();

    return reference;
  }

  function setMediaStatus(
    localId: string,
    patch: Partial<Omit<MediaItem, "localId" | "file" | "previewUrl" | "kind">>,
  ) {
    setMediaItems((current) =>
      current.map((item) =>
        item.localId === localId ? { ...item, ...patch } : item,
      ),
    );
  }

  async function uploadPendingMedia(listingId: string) {
    const pendingItems = mediaItems.filter(
      ({ status }) => status !== "uploaded",
    );
    const registeredByLocalId = new Map<string, MediaRow>();
    if (pendingItems.length === 0) return registeredByLocalId;

    for (const [index, item] of pendingItems.entries()) {
      const extension = ALLOWED_MEDIA_TYPES.get(item.file.type);
      if (!extension) {
        setMediaStatus(item.localId, {
          status: "error",
          error: "Formato no permitido.",
        });
        throw new Error(`El archivo “${item.file.name}” no es compatible.`);
      }

      let registeredMedia: MediaRow | undefined;

      try {
        setStatusMessage(
          `Registrando archivo ${index + 1} de ${pendingItems.length}…`,
        );
        setMediaStatus(item.localId, {
          status: "uploading",
          error: undefined,
        });

        registeredMedia = await invokePublicRpc<MediaRow>(
          "register_listing_media",
          {
            p_listing_id: listingId,
            p_media_type: item.kind,
            p_mime_type: item.file.type,
            p_size_bytes: item.file.size,
            p_extension: extension,
            p_media_id: item.localId,
          },
          "el registro de multimedia",
        );

        setMediaStatus(item.localId, {
          status: "uploading",
          sourcePath: registeredMedia.source_path,
          recordId: registeredMedia.id,
          isPrimary: registeredMedia.is_primary,
          error: undefined,
        });
        setStatusMessage(
          `Subiendo archivo ${index + 1} de ${pendingItems.length}…`,
        );
        const { error: uploadError } = await supabase.storage
          .from("listing-drafts")
          .upload(registeredMedia.source_path, item.file, {
            cacheControl: "3600",
            contentType: item.file.type,
            // A retry overwrites only this user's deterministic object path.
            upsert: true,
          });

        if (uploadError) throw uploadError;
      } catch {
        setMediaStatus(item.localId, {
          status: "error",
          error: "No se pudo subir.",
          sourcePath: registeredMedia?.source_path ?? item.sourcePath,
          recordId: registeredMedia?.id ?? item.recordId,
          isPrimary: registeredMedia?.is_primary ?? item.isPrimary,
        });
        throw new Error(`No se pudo subir “${item.file.name}”.`);
      }

      setMediaStatus(item.localId, {
        status: "uploaded",
        sourcePath: registeredMedia.source_path,
        recordId: registeredMedia.id,
        isPrimary: registeredMedia.is_primary,
        error: undefined,
      });
      registeredByLocalId.set(item.localId, registeredMedia);
    }

    return registeredByLocalId;
  }

  async function persistMediaOrder(
    listingId: string,
    registeredByLocalId: ReadonlyMap<string, MediaRow>,
  ) {
    if (mediaItems.length === 0) return;

    const orderedIds = mediaItems.map(
      (item) => item.recordId ?? registeredByLocalId.get(item.localId)?.id,
    );

    if (orderedIds.some((id) => !id)) {
      throw new Error(
        "No se pudo confirmar el orden de todos los archivos multimedia.",
      );
    }

    setStatusMessage("Guardando el orden de la multimedia…");
    const organizedMedia = await invokePublicRpcRows<MediaRow>(
      "organize_listing_media",
      {
        p_listing_id: listingId,
        p_ordered_ids: orderedIds as string[],
      },
      "la multimedia ordenada",
    );
    const organizedById = new Map(
      organizedMedia.map((media) => [media.id, media]),
    );

    setMediaItems((current) =>
      current.map((item) => {
        const recordId =
          item.recordId ?? registeredByLocalId.get(item.localId)?.id;
        const organized = recordId ? organizedById.get(recordId) : undefined;

        return organized
          ? {
              ...item,
              isPrimary: organized.is_primary,
              recordId: organized.id,
              sourcePath: organized.source_path,
              status: "uploaded",
            }
          : item;
      }),
    );
  }

  async function handleSaveDraft() {
    if (isBusy || isSubmitted || !applyValidation(2)) return;

    setBusyAction("saving");
    setGlobalError("");
    setSuccessMessage("");
    setStatusMessage("Guardando la información…");

    try {
      const reference = await persistDraft();
      const registeredMedia = await uploadPendingMedia(reference.id);
      await persistMediaOrder(reference.id, registeredMedia);

      const savedAt = new Date();
      setLastSavedAt(savedAt);
      setIsDirty(false);
      setStatusMessage("");
      setSuccessMessage(
        pendingMediaCount > 0
          ? "Borrador y multimedia guardados correctamente."
          : "Borrador guardado correctamente.",
      );
      onDraftSaved?.(reference.id);
    } catch (error) {
      setStatusMessage("");
      setGlobalError(presentError(error));
    } finally {
      setBusyAction(null);
    }
  }

  async function submitForReview(reference: DraftReference) {
    const submittedListing = await invokePublicRpc<ListingRow>(
      "submit_listing_for_review",
      {
        p_listing_id: reference.id,
        p_expected_version: reference.version,
      },
      "el anuncio enviado",
    );

    if (submittedListing.publication_status !== "pending_review") {
      throw new Error("El servidor no confirmó el envío a revisión.");
    }

    return submittedListing;
  }

  async function handleSubmitForReview() {
    if (isBusy || isSubmitted || !applyValidation(3, true)) return;

    setBusyAction("submitting");
    setGlobalError("");
    setSuccessMessage("");
    setStatusMessage("Preparando el anuncio…");

    try {
      const reference = await persistDraft();
      const registeredMedia = await uploadPendingMedia(reference.id);
      await persistMediaOrder(reference.id, registeredMedia);

      setStatusMessage("Enviando a revisión…");
      const submittedListing = await submitForReview(reference);

      setDraft({
        id: submittedListing.id,
        slug: submittedListing.slug,
        publicationStatus: "pending_review",
        version: submittedListing.version,
      });
      setLastSavedAt(new Date());
      setIsDirty(false);
      setStatusMessage("");
      setSuccessMessage(
        "Tu anuncio fue enviado a revisión. Te avisaremos cuando haya novedades.",
      );
      onSubmitted?.(reference.id);
    } catch (error) {
      setStatusMessage("");
      setGlobalError(presentError(error));
    } finally {
      setBusyAction(null);
    }
  }

  function markMediaArrangementChanged() {
    setErrors((current) => ({ ...current, media: undefined }));
    setGlobalError("");
    setSuccessMessage("");
    setIsDirty(true);
  }

  function moveMediaByOffset(localId: string, offset: -1 | 1) {
    if (isBusy || isSubmitted) return;

    setMediaItems((current) => {
      const sourceIndex = current.findIndex(
        (item) => item.localId === localId,
      );
      const targetIndex = sourceIndex + offset;

      if (
        sourceIndex < 0 ||
        targetIndex < 0 ||
        targetIndex >= current.length
      ) {
        return current;
      }

      const next = [...current];
      [next[sourceIndex], next[targetIndex]] = [
        next[targetIndex],
        next[sourceIndex],
      ];
      return next;
    });
    markMediaArrangementChanged();
  }

  function moveMediaToPosition(sourceId: string, targetId: string) {
    if (isBusy || isSubmitted || sourceId === targetId) return;

    setMediaItems((current) => {
      const sourceIndex = current.findIndex(
        (item) => item.localId === sourceId,
      );
      const targetIndex = current.findIndex(
        (item) => item.localId === targetId,
      );

      if (sourceIndex < 0 || targetIndex < 0) return current;

      const next = [...current];
      const [movedItem] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, movedItem);
      return next;
    });
    markMediaArrangementChanged();
  }

  function makeMediaCover(localId: string) {
    if (isBusy || isSubmitted) return;

    setMediaItems((current) => {
      const sourceIndex = current.findIndex(
        (item) => item.localId === localId,
      );
      const sourceItem = current[sourceIndex];

      if (!sourceItem || sourceItem.kind !== "image") return current;

      const next = current.filter((item) => item.localId !== localId);
      const firstImageIndex = next.findIndex(({ kind }) => kind === "image");
      next.splice(
        firstImageIndex === -1 ? next.length : firstImageIndex,
        0,
        sourceItem,
      );
      return next;
    });
    markMediaArrangementChanged();
  }

  function handleMediaDragStart(
    event: DragEvent<HTMLLIElement>,
    localId: string,
  ) {
    if (isBusy || isSubmitted) {
      event.preventDefault();
      return;
    }

    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", localId);
    setDraggedMediaId(localId);
  }

  function handleMediaDragOver(
    event: DragEvent<HTMLLIElement>,
    localId: string,
  ) {
    if (isBusy || isSubmitted) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = "move";
    setDragOverMediaId(localId);
  }

  function handleMediaDrop(
    event: DragEvent<HTMLLIElement>,
    targetId: string,
  ) {
    event.preventDefault();
    const sourceId =
      event.dataTransfer.getData("text/plain") || draggedMediaId;

    if (sourceId) moveMediaToPosition(sourceId, targetId);
    setDraggedMediaId(null);
    setDragOverMediaId(null);
  }

  function handleMediaDragEnd() {
    setDraggedMediaId(null);
    setDragOverMediaId(null);
  }

  function handleMediaSelection(event: ChangeEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    const selectedFiles = Array.from(input.files ?? []);
    input.value = "";

    if (selectedFiles.length === 0) return;

    const remainingSlots = MAX_MEDIA_ITEMS - mediaItems.length;
    if (remainingSlots <= 0) {
      setErrors((current) => ({
        ...current,
        media: `Puedes agregar hasta ${MAX_MEDIA_ITEMS} archivos.`,
      }));
      return;
    }

    const accepted: MediaItem[] = [];
    const rejected: string[] = [];

    for (const file of selectedFiles.slice(0, remainingSlots)) {
      if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
        rejected.push(`${file.name}: formato no permitido`);
        continue;
      }

      if (file.size <= 0 || file.size > MAX_FILE_BYTES) {
        rejected.push(`${file.name}: supera ${MAX_FILE_LABEL}`);
        continue;
      }

      const previewUrl = URL.createObjectURL(file);
      previewUrlsRef.current.add(previewUrl);
      accepted.push({
        localId: crypto.randomUUID(),
        file,
        kind: file.type.startsWith("image/") ? "image" : "video",
        previewUrl,
        status: "pending",
      });
    }

    setMediaItems((current) => [...current, ...accepted]);
    setErrors((current) => ({
      ...current,
      media:
        rejected.length > 0
          ? `No se agregaron: ${rejected.join("; ")}.`
          : undefined,
    }));
    setGlobalError("");
    setSuccessMessage("");
    setIsDirty(true);
  }

  async function removePendingMedia(localId: string) {
    const item = mediaItems.find((candidate) => candidate.localId === localId);
    if (
      !item ||
      isBusy ||
      item.status === "uploading" ||
      item.status === "removing"
    ) {
      return;
    }

    setRemovingMediaId(localId);
    setMediaStatus(localId, { status: "removing", error: undefined });
    setGlobalError("");

    try {
      if (draft) {
        const recordId = item.recordId ?? item.localId;
        const { data: storedMedia, error: lookupError } = await supabase
          .from("listing_media")
          .select("id, source_path")
          .eq("id", recordId)
          .eq("listing_id", draft.id)
          .maybeSingle();

        if (lookupError) throw lookupError;

        const sourcePath = storedMedia?.source_path ?? item.sourcePath;
        if (storedMedia && sourcePath) {
          const { error: storageError } = await supabase.storage
            .from("listing-drafts")
            .remove([sourcePath]);
          if (storageError) throw storageError;
        }

        if (storedMedia) {
          const { data: deletedMedia, error: deleteError } = await supabase
            .from("listing_media")
            .delete()
            .eq("id", recordId)
            .eq("listing_id", draft.id)
            .select("id")
            .maybeSingle();

          if (deleteError) throw deleteError;
          if (!deletedMedia) {
            throw new Error("No se confirmó la eliminación de multimedia.");
          }
        }
      }

      URL.revokeObjectURL(item.previewUrl);
      previewUrlsRef.current.delete(item.previewUrl);
      setMediaItems((current) =>
        current.filter((candidate) => candidate.localId !== localId),
      );
      setErrors((current) => ({ ...current, media: undefined }));
      setSuccessMessage("");
      setIsDirty(true);
    } catch {
      setMediaStatus(localId, {
        status: "error",
        error: "No se pudo quitar. Inténtalo de nuevo.",
      });
      setGlobalError(
        "No pudimos quitar ese archivo sin dejar datos incompletos. Inténtalo de nuevo.",
      );
    } finally {
      setRemovingMediaId(null);
    }
  }

  function renderStep() {
    if (step === 0) {
      return (
        <div className={styles.stepBody}>
          <div className={styles.field}>
            <label htmlFor={fieldId("organizationId")}>
              Publicar como <span aria-hidden="true">*</span>
            </label>
            <select
              aria-describedby={
                errors.organizationId
                  ? fieldErrorId("organizationId")
                  : undefined
              }
              aria-invalid={Boolean(errors.organizationId)}
              disabled={Boolean(draft) || isBusy}
              id={fieldId("organizationId")}
              onChange={(event) =>
                updateField("organizationId", event.currentTarget.value)
              }
              value={form.organizationId}
            >
              {organizations.length === 0 ? (
                <option value="">No hay organizaciones disponibles</option>
              ) : null}
              {organizations.map((organization) => (
                <option key={organization.id} value={organization.id}>
                  {organization.name}
                  {organization.verification_status === "verified"
                    ? " · Verificada"
                    : ""}
                </option>
              ))}
            </select>
            <FieldError id={fieldErrorId("organizationId")}>
              {errors.organizationId}
            </FieldError>
            {draft ? (
              <span className={styles.fieldHint}>
                La cuenta no puede cambiar después de crear el borrador.
              </span>
            ) : null}
          </div>

          <fieldset className={styles.choiceGroup}>
            <legend>Tipo de propiedad</legend>
            <div className={styles.propertyChoices}>
              {PROPERTY_OPTIONS.map((option) => (
                <label
                  className={classNames(
                    styles.choiceCard,
                    form.propertyType === option.value &&
                      styles.choiceCardSelected,
                  )}
                  key={option.value}
                >
                  <input
                    checked={form.propertyType === option.value}
                    disabled={isBusy}
                    name={`${instanceId}-property-type`}
                    onChange={() => selectPropertyType(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span className={styles.choiceIcon} aria-hidden="true">
                    {option.icon}
                  </span>
                  <strong>{option.label}</strong>
                  <small>{option.description}</small>
                </label>
              ))}
            </div>
          </fieldset>

          <fieldset className={styles.choiceGroup}>
            <legend>Tipo de operación</legend>
            <div className={styles.operationChoices}>
              {OPERATION_OPTIONS.map((option) => (
                <label
                  className={classNames(
                    styles.operationCard,
                    form.operationType === option.value &&
                      styles.operationCardSelected,
                  )}
                  key={option.value}
                >
                  <input
                    checked={form.operationType === option.value}
                    disabled={isBusy}
                    name={`${instanceId}-operation-type`}
                    onChange={() => selectOperationType(option.value)}
                    type="radio"
                    value={option.value}
                  />
                  <span>
                    <strong>{option.label}</strong>
                    <small>{option.description}</small>
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
        </div>
      );
    }

    if (step === 1) {
      const isLand = form.propertyType === "land";

      return (
        <div className={styles.stepBody}>
          <div className={styles.field}>
            <label htmlFor={fieldId("title")}>
              Título del anuncio <span aria-hidden="true">*</span>
            </label>
            <input
              aria-describedby={classNames(
                `${fieldId("title")}-hint`,
                errors.title && fieldErrorId("title"),
              )}
              aria-invalid={Boolean(errors.title)}
              disabled={isBusy}
              id={fieldId("title")}
              maxLength={180}
              minLength={10}
              onChange={(event) =>
                updateField("title", event.currentTarget.value)
              }
              placeholder={
                isLand
                  ? "Terreno residencial de 850 m² en zona tranquila"
                  : "Casa familiar de 3 habitaciones cerca del centro"
              }
              value={form.title}
            />
            <span className={styles.fieldHint} id={`${fieldId("title")}-hint`}>
              {form.title.length}/180 caracteres
            </span>
            <FieldError id={fieldErrorId("title")}>
              {errors.title}
            </FieldError>
          </div>

          <div className={styles.field}>
            <label htmlFor={fieldId("description")}>
              Descripción <span aria-hidden="true">*</span>
            </label>
            <textarea
              aria-describedby={classNames(
                `${fieldId("description")}-hint`,
                errors.description && fieldErrorId("description"),
              )}
              aria-invalid={Boolean(errors.description)}
              disabled={isBusy}
              id={fieldId("description")}
              maxLength={20_000}
              minLength={40}
              onChange={(event) =>
                updateField("description", event.currentTarget.value)
              }
              placeholder="Describe los espacios, accesos, estado, entorno y cualquier detalle que ayude a evaluar la propiedad."
              rows={6}
              value={form.description}
            />
            <span
              className={styles.fieldHint}
              id={`${fieldId("description")}-hint`}
            >
              Mínimo 40 caracteres · {form.description.length}/20,000
            </span>
            <FieldError id={fieldErrorId("description")}>
              {errors.description}
            </FieldError>
          </div>

          <fieldset className={styles.subsection}>
            <legend>Precio</legend>
            <label className={styles.checkbox}>
              <input
                checked={form.priceOnRequest}
                disabled={isBusy}
                onChange={(event) =>
                  updateField("priceOnRequest", event.currentTarget.checked)
                }
                type="checkbox"
              />
              <span>
                <strong>Precio a consultar</strong>
                <small>Oculta el monto y solicita contacto al interesado.</small>
              </span>
            </label>

            {!form.priceOnRequest ? (
              <div className={styles.formGridThree}>
                <div className={styles.field}>
                  <label htmlFor={fieldId("priceAmount")}>
                    Monto <span aria-hidden="true">*</span>
                  </label>
                  <input
                    aria-describedby={
                      errors.priceAmount
                        ? fieldErrorId("priceAmount")
                        : undefined
                    }
                    aria-invalid={Boolean(errors.priceAmount)}
                    disabled={isBusy}
                    id={fieldId("priceAmount")}
                    inputMode="decimal"
                    min="0"
                    onChange={(event) =>
                      updateField("priceAmount", event.currentTarget.value)
                    }
                    placeholder="0.00"
                    step="0.01"
                    type="number"
                    value={form.priceAmount}
                  />
                  <FieldError id={fieldErrorId("priceAmount")}>
                    {errors.priceAmount}
                  </FieldError>
                </div>

                <div className={styles.field}>
                  <label htmlFor={fieldId("currencyCode")}>Moneda</label>
                  <select
                    disabled={isBusy}
                    id={fieldId("currencyCode")}
                    onChange={(event) =>
                      updateField(
                        "currencyCode",
                        event.currentTarget.value as CurrencyCode,
                      )
                    }
                    value={form.currencyCode}
                  >
                    <option value="HNL">HNL · Lempiras</option>
                    <option value="USD">USD · Dólares</option>
                  </select>
                </div>

                <div className={styles.field}>
                  <label htmlFor={fieldId("pricePeriod")}>Periodo</label>
                  <select
                    disabled={isBusy || form.operationType === "sale"}
                    id={fieldId("pricePeriod")}
                    onChange={(event) =>
                      updateField(
                        "pricePeriod",
                        event.currentTarget.value as PricePeriod,
                      )
                    }
                    value={
                      form.operationType === "sale"
                        ? "total"
                        : form.pricePeriod
                    }
                  >
                    {form.operationType === "sale" ? (
                      <option value="total">Precio total</option>
                    ) : (
                      <>
                        <option value="monthly">Mensual</option>
                        <option value="yearly">Anual</option>
                        <option value="weekly">Semanal</option>
                        <option value="daily">Diario</option>
                      </>
                    )}
                  </select>
                </div>
              </div>
            ) : null}
          </fieldset>

          {!isLand ? (
            <fieldset className={styles.subsection}>
              <legend>Características</legend>
              <div className={styles.formGridThree}>
                <NumberField
                  disabled={isBusy}
                  error={errors.bedrooms}
                  id={fieldId("bedrooms")}
                  label="Habitaciones"
                  min="0"
                  onChange={(value) => updateField("bedrooms", value)}
                  step="1"
                  value={form.bedrooms}
                />
                <NumberField
                  disabled={isBusy}
                  error={errors.bathrooms}
                  id={fieldId("bathrooms")}
                  label="Baños"
                  min="0"
                  onChange={(value) => updateField("bathrooms", value)}
                  step="0.5"
                  value={form.bathrooms}
                />
                <NumberField
                  disabled={isBusy}
                  error={errors.parkingSpaces}
                  id={fieldId("parkingSpaces")}
                  label="Estacionamientos"
                  min="0"
                  onChange={(value) => updateField("parkingSpaces", value)}
                  step="1"
                  value={form.parkingSpaces}
                />
              </div>
            </fieldset>
          ) : null}

          <fieldset className={styles.subsection}>
            <legend>Áreas</legend>
            <div className={styles.formGridTwo}>
              <AreaField
                disabled={isBusy}
                error={errors.landArea}
                id={fieldId("landArea")}
                label={isLand ? "Área del terreno *" : "Área del terreno"}
                onUnitChange={(value) => updateField("landAreaUnit", value)}
                onValueChange={(value) => updateField("landArea", value)}
                unit={form.landAreaUnit}
                value={form.landArea}
              />
              {!isLand ? (
                <AreaField
                  disabled={isBusy}
                  error={errors.constructionArea}
                  id={fieldId("constructionArea")}
                  label="Área de construcción *"
                  onUnitChange={(value) =>
                    updateField("constructionAreaUnit", value)
                  }
                  onValueChange={(value) =>
                    updateField("constructionArea", value)
                  }
                  unit={form.constructionAreaUnit}
                  value={form.constructionArea}
                />
              ) : null}
            </div>
          </fieldset>

          {!isLand ? (
            <div className={styles.fieldNarrow}>
              <NumberField
                disabled={isBusy}
                error={errors.yearBuilt}
                id={fieldId("yearBuilt")}
                label="Año de construcción"
                max={String(new Date().getFullYear())}
                min="1800"
                onChange={(value) => updateField("yearBuilt", value)}
                step="1"
                value={form.yearBuilt}
              />
            </div>
          ) : null}
        </div>
      );
    }

    if (step === 2) {
      return (
        <div className={styles.stepBody}>
          <div className={styles.locationNotice}>
            <span aria-hidden="true">⌖</span>
            <div>
              <strong>Protege la ubicación exacta</strong>
              <p>
                El punto que elijas se guarda de forma privada. Al público le
                mostraremos únicamente una referencia general de la zona.
              </p>
            </div>
          </div>

          <LocationMapPicker
            disabled={isBusy || isSubmitted}
            latitude={form.latitude}
            longitude={form.longitude}
            onCoordinatesChange={updateMapCoordinates}
            onLocationDetailsChange={applyMapLocationDetails}
          />

          <div className={styles.formGridTwo}>
            <TextField
              disabled={isBusy}
              error={errors.department}
              id={fieldId("department")}
              label="Departamento *"
              onChange={(value) => updateField("department", value)}
              placeholder="Francisco Morazán"
              value={form.department}
            />
            <TextField
              disabled={isBusy}
              error={errors.municipality}
              id={fieldId("municipality")}
              label="Municipio *"
              onChange={(value) => updateField("municipality", value)}
              placeholder="Distrito Central"
              value={form.municipality}
            />
            <TextField
              disabled={isBusy}
              id={fieldId("city")}
              label="Ciudad"
              onChange={(value) => updateField("city", value)}
              placeholder="Tegucigalpa"
              value={form.city}
            />
            <TextField
              disabled={isBusy}
              id={fieldId("zone")}
              label="Zona, barrio o residencial"
              onChange={(value) => updateField("zone", value)}
              placeholder="Lomas del Guijarro"
              value={form.zone}
            />
          </div>

          <TextField
            disabled={isBusy}
            id={fieldId("visibleAddress")}
            label="Dirección exacta o indicaciones privadas"
            maxLength={500}
            onChange={(value) => updateField("visibleAddress", value)}
            placeholder="Ej. casa 14, portón azul; solo la verá el equipo autorizado"
            value={form.visibleAddress}
          />

          <fieldset className={styles.subsection}>
            <legend>Punto exacto protegido</legend>
            <p className={styles.subsectionCopy}>
              El mapa completa estos valores privados automáticamente. También
              puedes corregirlos manualmente; nunca publicaremos los seis
              decimales exactos.
            </p>
            <div className={styles.formGridThree}>
              <NumberField
                disabled={isBusy}
                error={errors.latitude}
                id={fieldId("latitude")}
                label="Latitud seleccionada *"
                max={String(HONDURAS_BOUNDS.north)}
                min={String(HONDURAS_BOUNDS.south)}
                onChange={(value) => updateField("latitude", value)}
                placeholder="14.0723"
                step="0.000001"
                value={form.latitude}
              />
              <NumberField
                disabled={isBusy}
                error={errors.longitude}
                id={fieldId("longitude")}
                label="Longitud seleccionada *"
                max={String(HONDURAS_BOUNDS.east)}
                min={String(HONDURAS_BOUNDS.west)}
                onChange={(value) => updateField("longitude", value)}
                placeholder="-87.1921"
                step="0.000001"
                value={form.longitude}
              />
              <div className={styles.field}>
                <label htmlFor={fieldId("precision")}>Referencia pública</label>
                <select
                  disabled={isBusy}
                  id={fieldId("precision")}
                  onChange={(event) =>
                    updateField(
                      "precision",
                      event.currentTarget.value as LocationPrecision,
                    )
                  }
                  value={form.precision}
                >
                  <option value="approximate">Punto aproximado</option>
                  <option value="zone">Solo zona</option>
                </select>
              </div>
            </div>
          </fieldset>
        </div>
      );
    }

    return (
      <div className={styles.stepBody}>
        <div className={styles.mediaSection}>
          <div className={styles.mediaHeading}>
            <div>
              <h3>Fotografías y videos</h3>
              <p>
                Hasta {MAX_MEDIA_ITEMS} archivos, máximo {MAX_FILE_LABEL} cada
                uno. Arrástralos para ordenar: el primer archivo se verá
                primero y la primera fotografía será la portada.
              </p>
            </div>
            <span>
              {mediaItems.length}/{MAX_MEDIA_ITEMS}
            </span>
          </div>

          <label
            className={classNames(
              styles.dropzone,
              errors.media && styles.dropzoneError,
            )}
            htmlFor={fieldId("media")}
          >
            <input
              accept={Array.from(ALLOWED_MEDIA_TYPES.keys()).join(",")}
              aria-describedby={
                errors.media ? fieldErrorId("media") : `${fieldId("media")}-hint`
              }
              aria-invalid={Boolean(errors.media)}
              disabled={
                isBusy || isSubmitted || mediaItems.length >= MAX_MEDIA_ITEMS
              }
              id={fieldId("media")}
              multiple
              onChange={handleMediaSelection}
              type="file"
            />
            <span className={styles.uploadIcon} aria-hidden="true">
              ↑
            </span>
            <strong>Selecciona fotos o videos</strong>
            <small id={`${fieldId("media")}-hint`}>
              JPG, PNG, WebP, AVIF, MP4, WebM o MOV
            </small>
          </label>
          <FieldError id={fieldErrorId("media")}>{errors.media}</FieldError>

          {mediaItems.length > 0 ? (
            <ul className={styles.mediaGrid} aria-label="Multimedia seleccionada">
              {mediaItems.map((item, index) => {
                const isCover = item.localId === primaryMediaLocalId;

                return (
                  <li
                    className={classNames(
                      styles.mediaCard,
                      draggedMediaId === item.localId &&
                        styles.mediaCardDragging,
                      dragOverMediaId === item.localId &&
                        draggedMediaId !== item.localId &&
                        styles.mediaCardDropTarget,
                    )}
                    data-position={index + 1}
                    draggable={!isBusy && !isSubmitted && mediaItems.length > 1}
                    key={item.localId}
                    onDragEnd={handleMediaDragEnd}
                    onDragOver={(event) =>
                      handleMediaDragOver(event, item.localId)
                    }
                    onDragStart={(event) =>
                      handleMediaDragStart(event, item.localId)
                    }
                    onDrop={(event) => handleMediaDrop(event, item.localId)}
                  >
                    {item.kind === "image" ? (
                      // The source is a local object URL chosen by the user.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt="" src={item.previewUrl} />
                    ) : (
                      <video
                        aria-label={`Vista previa de ${item.file.name}`}
                        muted
                        playsInline
                        preload="metadata"
                        src={item.previewUrl}
                      />
                    )}
                    <div className={styles.mediaOverlay}>
                      <span
                        className={classNames(
                          styles.mediaStatus,
                          styles[`mediaStatus_${item.status}`],
                        )}
                      >
                        {item.status === "pending" &&
                          (isCover ? "Portada al guardar" : "Pendiente")}
                        {item.status === "uploading" && "Subiendo…"}
                        {item.status === "removing" && "Quitando…"}
                        {item.status === "uploaded" &&
                          (isCover ? "Portada" : "Guardado")}
                        {item.status === "error" && "Reintentar"}
                      </span>
                      {item.status !== "uploading" &&
                      item.status !== "removing" ? (
                        <button
                          aria-label={`Quitar ${item.file.name}`}
                          className={styles.removeMedia}
                          disabled={isBusy || isSubmitted}
                          onClick={() => void removePendingMedia(item.localId)}
                          type="button"
                        >
                          ×
                        </button>
                      ) : null}
                    </div>
                    <div className={styles.mediaMeta}>
                      <div className={styles.mediaPosition}>
                        <span>{index + 1}</span>
                        <small>
                          {index === 0 ? "Se verá primero" : "Orden de galería"}
                        </small>
                      </div>
                      <strong title={item.file.name}>{item.file.name}</strong>
                      <span>{(item.file.size / 1024 / 1024).toFixed(1)} MB</span>
                      {item.error ? (
                        <small className={styles.mediaError}>{item.error}</small>
                      ) : null}
                      <div
                        className={styles.mediaControls}
                        aria-label={`Orden de ${item.file.name}`}
                        role="group"
                      >
                        <button
                          aria-label={`Mover ${item.file.name} antes`}
                          disabled={isBusy || isSubmitted || index === 0}
                          onClick={() => moveMediaByOffset(item.localId, -1)}
                          title="Mover antes"
                          type="button"
                        >
                          ←
                        </button>
                        <button
                          aria-label={`Mover ${item.file.name} después`}
                          disabled={
                            isBusy ||
                            isSubmitted ||
                            index === mediaItems.length - 1
                          }
                          onClick={() => moveMediaByOffset(item.localId, 1)}
                          title="Mover después"
                          type="button"
                        >
                          →
                        </button>
                        {isCover ? (
                          <span className={styles.coverSelection}>Portada</span>
                        ) : item.kind === "image" ? (
                          <button
                            className={styles.coverButton}
                            disabled={isBusy || isSubmitted}
                            onClick={() => makeMediaCover(item.localId)}
                            type="button"
                          >
                            Usar de portada
                          </button>
                        ) : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : null}
        </div>

        <div className={styles.reviewPanel}>
          <div className={styles.reviewHeader}>
            <div>
              <span>Resumen del anuncio</span>
              <h3>{form.title || "Propiedad sin título"}</h3>
            </div>
            <button
              disabled={isBusy}
              onClick={() => goToStep(1)}
              type="button"
            >
              Editar detalles
            </button>
          </div>

          <dl className={styles.reviewGrid}>
            <div>
              <dt>Publica</dt>
              <dd>{selectedOrganization?.name ?? "Sin cuenta"}</dd>
            </div>
            <div>
              <dt>Tipo</dt>
              <dd>
                {
                  PROPERTY_OPTIONS.find(
                    ({ value }) => value === form.propertyType,
                  )?.label
                }
              </dd>
            </div>
            <div>
              <dt>Operación</dt>
              <dd>{form.operationType === "sale" ? "Venta" : "Alquiler"}</dd>
            </div>
            <div>
              <dt>Precio</dt>
              <dd>
                {form.priceOnRequest
                  ? "A consultar"
                  : `${form.currencyCode} ${form.priceAmount || "—"}${
                      form.operationType === "rent" ? " / periodo" : ""
                    }`}
              </dd>
            </div>
            <div>
              <dt>Ubicación</dt>
              <dd>
                {[form.zone, form.city, form.municipality, form.department]
                  .filter(Boolean)
                  .join(", ") || "Sin ubicación"}
              </dd>
            </div>
            <div>
              <dt>Multimedia</dt>
              <dd>
                {uploadedMediaCount} guardado
                {uploadedMediaCount === 1 ? "" : "s"}
                {pendingMediaCount > 0
                  ? ` · ${pendingMediaCount} pendiente${
                      pendingMediaCount === 1 ? "" : "s"
                    }`
                  : ""}
              </dd>
            </div>
          </dl>

          <div className={styles.reviewNote}>
            <span aria-hidden="true">✓</span>
            <p>
              El anuncio se guardará como borrador. Al enviarlo, Zelaya Raíces
              revisará la información antes de publicarla.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <section
        className={classNames(styles.wizard, styles.emptyState, className)}
      >
        <span aria-hidden="true">⌂</span>
        <h2>No hay una cuenta habilitada para publicar</h2>
        <p>
          Debes pertenecer a una agencia, cuenta empresarial o cuenta de
          propietario antes de crear propiedades.
        </p>
      </section>
    );
  }

  return (
    <section
      aria-labelledby={`${instanceId}-wizard-title`}
      className={classNames(styles.wizard, className)}
    >
      <header className={styles.wizardHeader}>
        <div>
          <p className={styles.eyebrow}>Asistente de publicación</p>
          <h2 id={`${instanceId}-wizard-title`}>Nueva propiedad</h2>
          <p>
            Completa la información paso a paso. Nada se publica sin revisión.
          </p>
        </div>
        <span className={styles.trustBadge}>
          <span aria-hidden="true">✓</span>
          Publicación revisada
        </span>
      </header>

      <nav aria-label="Progreso de la publicación" className={styles.stepNav}>
        <ol>
          {STEPS.map((item, index) => {
            const isCurrent = index === step;
            const isComplete = index < step || index < furthestStep;
            const isAvailable = index <= furthestStep;

            return (
              <li
                className={classNames(
                  isCurrent && styles.stepCurrent,
                  isComplete && styles.stepComplete,
                )}
                key={item.shortLabel}
              >
                <button
                  aria-current={isCurrent ? "step" : undefined}
                  aria-label={`Paso ${index + 1}: ${item.shortLabel}`}
                  disabled={!isAvailable || isBusy}
                  onClick={() => goToStep(index)}
                  type="button"
                >
                  <span aria-hidden="true">
                    {isComplete && !isCurrent ? "✓" : index + 1}
                  </span>
                  <strong>{item.shortLabel}</strong>
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      <form className={styles.form} noValidate onSubmit={handleFormSubmit}>
        <div className={styles.stepIntro}>
          <span>
            Paso {step + 1} de {STEPS.length}
          </span>
          <h3 ref={headingRef} tabIndex={-1}>
            {STEPS[step].title}
          </h3>
          <p>{STEPS[step].description}</p>
        </div>

        {globalError ? (
          <div className={styles.errorBanner} role="alert">
            <span aria-hidden="true">!</span>
            <div>
              <strong>No pudimos completar la acción</strong>
              <p>{globalError}</p>
            </div>
          </div>
        ) : null}

        {successMessage ? (
          <div className={styles.successBanner} role="status">
            <span aria-hidden="true">✓</span>
            <div>
              <strong>
                {isSubmitted ? "Anuncio enviado" : "Cambios guardados"}
              </strong>
              <p>{successMessage}</p>
            </div>
          </div>
        ) : null}

        {renderStep()}

        <footer className={styles.formFooter}>
          <div className={styles.saveState} aria-live="polite">
            {statusMessage ? (
              <>
                <span className={styles.spinner} aria-hidden="true" />
                {statusMessage}
              </>
            ) : lastSavedAt ? (
              <>
                <span aria-hidden="true">✓</span>
                Guardado a las{" "}
                {lastSavedAt.toLocaleTimeString("es-HN", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
                {isDirty ? " · hay cambios pendientes" : ""}
              </>
            ) : isDirty ? (
              "Cambios sin guardar"
            ) : (
              "El borrador se guardará al completar la ubicación."
            )}
          </div>

          <div className={styles.footerActions}>
            {step > 0 ? (
              <button
                className={styles.secondaryButton}
                disabled={isBusy}
                onClick={() => goToStep(step - 1)}
                type="button"
              >
                Atrás
              </button>
            ) : null}

            <button
              className={styles.ghostButton}
              disabled={isBusy || isSubmitted || step < 2}
              onClick={() => void handleSaveDraft()}
              title={
                step < 2
                  ? "Completa primero los detalles y la ubicación"
                  : undefined
              }
              type="button"
            >
              {busyAction === "saving" ? "Guardando…" : "Guardar borrador"}
            </button>

            {step < STEPS.length - 1 ? (
              <button
                className={styles.primaryButton}
                disabled={isBusy}
                type="submit"
              >
                Continuar
                <span aria-hidden="true">→</span>
              </button>
            ) : (
              <button
                className={styles.primaryButton}
                disabled={isBusy || isSubmitted}
                type="submit"
              >
                {busyAction === "submitting"
                  ? "Enviando…"
                  : isSubmitted
                    ? "Enviado a revisión"
                    : "Enviar a revisión"}
                {!isBusy && !isSubmitted ? (
                  <span aria-hidden="true">→</span>
                ) : null}
              </button>
            )}
          </div>
        </footer>
      </form>
    </section>
  );
}

function TextField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  placeholder,
  maxLength,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
  placeholder?: string;
  maxLength?: number;
}) {
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        id={id}
        maxLength={maxLength}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        value={value}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

function NumberField({
  id,
  label,
  value,
  onChange,
  error,
  disabled,
  placeholder,
  min,
  max,
  step,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  disabled: boolean;
  placeholder?: string;
  min?: string;
  max?: string;
  step?: string;
}) {
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <input
        aria-describedby={error ? errorId : undefined}
        aria-invalid={Boolean(error)}
        disabled={disabled}
        id={id}
        inputMode="decimal"
        max={max}
        min={min}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        step={step}
        type="number"
        value={value}
      />
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}

function AreaField({
  id,
  label,
  value,
  unit,
  onValueChange,
  onUnitChange,
  error,
  disabled,
}: {
  id: string;
  label: string;
  value: string;
  unit: AreaUnit;
  onValueChange: (value: string) => void;
  onUnitChange: (value: AreaUnit) => void;
  error?: string;
  disabled: boolean;
}) {
  const errorId = `${id}-error`;

  return (
    <div className={styles.field}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.compoundField}>
        <input
          aria-describedby={error ? errorId : undefined}
          aria-invalid={Boolean(error)}
          disabled={disabled}
          id={id}
          inputMode="decimal"
          min="0.01"
          onChange={(event) => onValueChange(event.currentTarget.value)}
          placeholder="0.00"
          step="0.01"
          type="number"
          value={value}
        />
        <select
          aria-label={`Unidad para ${label}`}
          disabled={disabled}
          onChange={(event) =>
            onUnitChange(event.currentTarget.value as AreaUnit)
          }
          value={unit}
        >
          <option value="m2">m²</option>
          <option value="vara2">varas²</option>
          <option value="manzana">manzanas</option>
          <option value="sqft">pies²</option>
          <option value="acre">acres</option>
        </select>
      </div>
      <FieldError id={errorId}>{error}</FieldError>
    </div>
  );
}
