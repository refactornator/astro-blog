import imageUrlBuilder from "@sanity/image-url";
import { client } from "./sanityClient";

const builder = imageUrlBuilder(client);

export const urlFor = (src: any) => builder.image(src);
