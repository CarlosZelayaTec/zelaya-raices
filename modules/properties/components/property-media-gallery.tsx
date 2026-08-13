"use client";

import { useEffect, useMemo, useRef, useState } from "react";

import type { PropertyMedia } from "@/modules/properties/types";

import styles from "./property-media-gallery.module.css";

type PropertyMediaGalleryProps = {
  media: readonly PropertyMedia[];
  propertyTitle: string;
  verified: boolean;
};

function mediaAlt(
  media: PropertyMedia,
  index: number,
  propertyTitle: string,
) {
  return (
    media.altText ||
    (index === 0 ? propertyTitle : `Vista ${index + 1} de ${propertyTitle}`)
  );
}

export function PropertyMediaGallery({
  media,
  propertyTitle,
  verified,
}: PropertyMediaGalleryProps) {
  const galleryRef = useRef<HTMLElement>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const images = useMemo(
    () => media.filter((item) => item.type === "image"),
    [media],
  );
  const activeImage = images[activeImageIndex];

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || !lightboxOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (!dialog.open) dialog.showModal();
    closeButtonRef.current?.focus();

    return () => {
      document.body.style.overflow = previousOverflow;
      if (dialog.open) dialog.close();
    };
  }, [lightboxOpen]);

  function openImage(mediaItem: PropertyMedia) {
    const index = images.findIndex((item) => item.id === mediaItem.id);
    if (index < 0) return;
    setActiveImageIndex(index);
    setLightboxOpen(true);
  }

  function closeLightbox() {
    setLightboxOpen(false);
  }

  function moveLightbox(direction: -1 | 1) {
    setActiveImageIndex((current) =>
      (current + direction + images.length) % images.length,
    );
  }

  function scrollToMedia(index: number) {
    const gallery = galleryRef.current;
    const item = gallery?.querySelector<HTMLElement>(
      `[data-gallery-index="${index}"]`,
    );
    if (!gallery || !item) return;

    gallery.scrollTo({
      behavior: "smooth",
      left: item.offsetLeft - gallery.offsetLeft,
    });
    setActiveMediaIndex(index);
  }

  function handleGalleryScroll() {
    const gallery = galleryRef.current;
    if (!gallery) return;

    const items = Array.from(
      gallery.querySelectorAll<HTMLElement>("[data-gallery-index]"),
    );
    const galleryCenter = gallery.scrollLeft + gallery.clientWidth / 2;
    let nearestIndex = 0;
    let nearestDistance = Number.POSITIVE_INFINITY;

    items.forEach((item, index) => {
      const itemCenter = item.offsetLeft + item.offsetWidth / 2;
      const distance = Math.abs(itemCenter - galleryCenter);
      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = index;
      }
    });

    setActiveMediaIndex(nearestIndex);
  }

  if (media.length === 0) return null;

  return (
    <>
      <section
        aria-label="Galería de la propiedad"
        className={styles.gallery}
        onScroll={handleGalleryScroll}
        ref={galleryRef}
      >
        {media.map((item, index) =>
          item.type === "video" ? (
            <div
              className={styles.item}
              data-gallery-index={index}
              key={item.id}
            >
              <video
                aria-label={
                  item.altText || `Video ${index + 1} de ${propertyTitle}`
                }
                controls
                playsInline
                preload="metadata"
                src={item.url}
              />
            </div>
          ) : (
            <button
              aria-label={`Ampliar imagen ${images.findIndex((image) => image.id === item.id) + 1} de ${images.length}`}
              className={`${styles.item} ${styles.imageButton}`}
              data-gallery-index={index}
              key={item.id}
              onClick={() => openImage(item)}
              type="button"
            >
              {/* Public property media can come from Supabase signed/CDN URLs. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={mediaAlt(item, index, propertyTitle)}
                loading={index === 0 ? "eager" : "lazy"}
                src={item.url}
              />
              <span className={styles.zoomCue}>
                <span aria-hidden="true">⌕</span>
                Ver en grande
              </span>
            </button>
          ),
        )}

        {verified ? (
          <span className={`verification-badge ${styles.verifiedBadge}`}>
            <span aria-hidden="true">✓</span> Propiedad verificada
          </span>
        ) : null}

        {images.length > 0 ? (
          <button
            className={styles.openGalleryButton}
            onClick={() => openImage(images[0])}
            type="button"
          >
            <span aria-hidden="true">▦</span>
            {images.length === 1 ? "Ampliar foto" : `Ver ${images.length} fotos`}
          </button>
        ) : null}

        <div className={styles.mobileGuide} aria-hidden="true">
          <span>
            {media.length > 1 ? "Desliza para ver más" : "Toca para ampliar"}
          </span>
          <strong>
            {activeMediaIndex + 1}/{media.length}
          </strong>
        </div>

        {media.length > 1 ? (
          <div className={styles.mobileControls}>
            <button
              aria-label="Ver elemento anterior"
              disabled={activeMediaIndex === 0}
              onClick={() => scrollToMedia(Math.max(0, activeMediaIndex - 1))}
              type="button"
            >
              <span aria-hidden="true">‹</span>
            </button>
            <button
              aria-label="Ver elemento siguiente"
              disabled={activeMediaIndex === media.length - 1}
              onClick={() =>
                scrollToMedia(Math.min(media.length - 1, activeMediaIndex + 1))
              }
              type="button"
            >
              <span aria-hidden="true">›</span>
            </button>
          </div>
        ) : null}
      </section>

      <dialog
        aria-label={`Vista ampliada de ${propertyTitle}`}
        className={styles.lightbox}
        onCancel={closeLightbox}
        onClick={(event) => {
          if (event.target === event.currentTarget) closeLightbox();
        }}
        onClose={() => setLightboxOpen(false)}
        onKeyDown={(event) => {
          if (event.key === "Escape") {
            event.preventDefault();
            closeLightbox();
            return;
          }
          if (event.key === "ArrowLeft" && images.length > 1) {
            event.preventDefault();
            moveLightbox(-1);
          }
          if (event.key === "ArrowRight" && images.length > 1) {
            event.preventDefault();
            moveLightbox(1);
          }
        }}
        ref={dialogRef}
      >
        {activeImage ? (
          <div className={styles.lightboxContent}>
            <header>
              <div>
                <strong>{propertyTitle}</strong>
                <span>
                  Imagen {activeImageIndex + 1} de {images.length}
                </span>
              </div>
              <button
                aria-label="Cerrar imagen ampliada"
                className={styles.closeButton}
                onClick={closeLightbox}
                ref={closeButtonRef}
                type="button"
              >
                <span aria-hidden="true">×</span>
              </button>
            </header>

            <div className={styles.lightboxImageWrap}>
              {images.length > 1 ? (
                <button
                  aria-label="Ver imagen anterior"
                  className={`${styles.lightboxArrow} ${styles.previousArrow}`}
                  onClick={() => moveLightbox(-1)}
                  type="button"
                >
                  <span aria-hidden="true">‹</span>
                </button>
              ) : null}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                alt={mediaAlt(activeImage, activeImageIndex, propertyTitle)}
                src={activeImage.url}
              />
              {images.length > 1 ? (
                <button
                  aria-label="Ver imagen siguiente"
                  className={`${styles.lightboxArrow} ${styles.nextArrow}`}
                  onClick={() => moveLightbox(1)}
                  type="button"
                >
                  <span aria-hidden="true">›</span>
                </button>
              ) : null}
            </div>

            <footer>
              <span>{mediaAlt(activeImage, activeImageIndex, propertyTitle)}</span>
              {images.length > 1 ? (
                <small>Usa las flechas o ← → para navegar</small>
              ) : null}
            </footer>
          </div>
        ) : null}
      </dialog>
    </>
  );
}
