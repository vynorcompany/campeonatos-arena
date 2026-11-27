import { RequestBodyTooLargeError } from "./json-body";
/** Bound raw bytes before parsing multipart, including chunked requests without Content-Length. */
export async function readBoundedMultipart(request: Request, maxBytes: number) {
 if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new RangeError("Invalid body limit");
 const type=request.headers.get("content-type") ?? "";
 if (!/^multipart\/form-data\s*;/i.test(type)) throw Error("Multipart required");
 const declared=request.headers.get("content-length");
 if(declared && Number(declared)>maxBytes) throw new RequestBodyTooLargeError();
 if(!request.body) throw Error("Missing body");
 const reader=request.body.getReader(),chunks:Uint8Array[]=[];let size=0;
 try { while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>maxBytes){void reader.cancel().catch(()=>{});throw new RequestBodyTooLargeError();}chunks.push(value);} } finally {reader.releaseLock();}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
 return new Response(bytes,{headers:{"content-type":type}}).formData();
}
