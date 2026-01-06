import * as z from 'zod';
import { schemaUtils } from 'src/components/hook-form';

export interface ExampleRich {
   id?: string;
   title?: string;
   slug?: string;
   description?: string;
   image?: string | File | null;
   content?: string;
   galleries?: string | File[];
   created_at?: string;
   updated_at?: string;
}

export type ExampleRichType = z.infer<typeof ExampleRichSchema> & {
   id?: string;
};

export const ExampleRichSchema = z.object({
   title: z.string().min(1, { message: 'Title is required' }),
   slug: z.string().optional(),
   description: z.string().optional(),
   image: schemaUtils.file().optional(),
   content: z.string().optional(),
   galleries: z.array(schemaUtils.file()).optional(),
});
