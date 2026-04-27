export interface TestimonialItem {
   id: string;
   name: string;
   content: string;
   [key: string]: any;
}

export interface TestimonialSchema {
   name?: string;
   content?: string;
   [key: string]: any;
}
