import { client } from "./sanityClient";

const QUERY = /* groq */ `
*[_type == "photoSection" && slug.current == $slug][0]{
  title,
  slug,
  photos[]{
    _key,
    alt,
    caption,
    asset->{
      _id,
      url,
      metadata{
        lqip,
        dimensions{ width, height, aspectRatio },
        exif{ DateTimeOriginal }
      }
    }
  }
}
`;

export async function fetchPhotoSection(slug: string) {
  const data = await client.fetch(QUERY, { slug });
  if (!data) return null;

  return { 
    title: data.title, 
    slug: data.slug?.current ?? slug, 
    photos: data.photos
  };
}
