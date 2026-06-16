"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { UploadButton } from "@/lib/uploadthing";
import { Button } from "./ui/button";

interface ProfileAvatarProps {
  name: string | null;
  email: string;
  image: string | null;
}

function getInitials(name: string | null, email: string) {
  if (name?.trim()) {
    return name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("");
  }
  return email.slice(0, 2).toUpperCase();
}

export default function ProfileAvatar({
  name,
  email,
  image: initialImage,
}: ProfileAvatarProps) {
  const router = useRouter();
  const [image, setImage] = useState(initialImage);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function saveImageUrl(nextImage: string | null) {
    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      await api.updateProfile({ image: nextImage });
      setImage(nextImage);
      setMessage(nextImage ? "Profile photo updated." : "Profile photo removed.");
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to update profile photo",
      );
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className='flex flex-col items-center text-center'>
      {image ? (
        <img
          src={image}
          alt={name ?? email}
          className='h-24 w-24 rounded-full object-cover'
        />
      ) : (
        <div className='flex h-24 w-24 items-center justify-center rounded-full bg-blue-100 text-2xl font-bold text-blue-700'>
          {getInitials(name, email)}
        </div>
      )}

      <div className='mt-4 flex flex-col items-center gap-2'>
        <UploadButton
          endpoint='imageUploader'
          onUploadBegin={() => {
            setUploading(true);
            setError(null);
            setMessage(null);
          }}
          onClientUploadComplete={(files) => {
            const uploadedUrl = files?.[0]?.ufsUrl;
            if (!uploadedUrl) {
              setUploading(false);
              setError("Upload finished but no image URL was returned.");
              return;
            }
            void saveImageUrl(uploadedUrl);
          }}
          onUploadError={(err) => {
            setUploading(false);
            setError(err.message);
          }}
          appearance={{
            button:
              "bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 ut-ready:bg-blue-600 ut-uploading:bg-blue-400",
          }}
          content={{
            button({ ready }) {
              if (uploading) return "Uploading...";
              return ready ? "Upload photo" : "Preparing...";
            },
          }}
        />
        {image && (
          <Button
            type='button'
            variant='outline'
            size='sm'
            disabled={uploading}
            onClick={() => void saveImageUrl(null)}
          >
            Remove photo
          </Button>
        )}
      </div>

      {message && <p className='mt-2 text-xs text-emerald-700'>{message}</p>}
      {error && <p className='mt-2 text-xs text-red-600'>{error}</p>}
    </div>
  );
}
