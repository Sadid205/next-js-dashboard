'use server';
import { revalidatePath } from 'next/cache';
import {redirect} from 'next/navigation'
import postgres from 'postgres';
import {z} from 'zod'
const sql = postgres(process.env.POSTGRES_URL!,{ssl:'require'})
const FormSchema = z.object({
    id:z.string(),
    customerId:z.string({
      invalid_type_error:"Please select a customer.",
    }),
    amount:z.coerce.number().gt(0,{message:"Please enter an amount greater than $0."}),
    status:z.enum(['pending','paid'],{
      invalid_type_error:"Please select an invoice status."
    }),
    date:z.string()
})
export type State = {
  errors?:{
    customerId?:string[];
    amount?:string[];
    status?:string[];
  };
  message?:string|null;
}
const CreateInvoice = FormSchema.omit({id:true,date:true})
export async function createInvoice(prevState:State,formData:FormData){
    // console.log("FormData",Object.fromEntries(formData.entries()))
    const validatedFields = CreateInvoice.safeParse({
        customerId : formData.get('customerId'),
        amount : formData.get('amount'),
        status :formData.get('status'),
    })
    console.log("validatedFields",validatedFields.error?.flatten())
    if (!validatedFields.success){
      return {
        errors:validatedFields.error.flatten().fieldErrors,
        message:"Missing Fields. Failed to Create Invoice."
      }
    }
    const {customerId,amount,status} = validatedFields.data
    const amountInCents = amount * 100
    const date = new Date().toISOString().split('T')[0];
    try{
      await sql `
      INSERT INTO invoices (customer_id, amount, status, date)
      VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
      `;
    }catch(error){
      console.log(error)
    }
    revalidatePath('/dashboard/invoices');
    redirect('/dashboard/invoices')
}

// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true });
 
// ...
 
export async function updateInvoice(id: string,prevState:State,formData: FormData) {
  const validatedFields = UpdateInvoice.safeParse({
    customerId: formData.get('customerId'),
    amount: formData.get('amount'),
    status: formData.get('status'),
  });
 
  if (!validatedFields.success){
    return{
      errors:validatedFields.error.flatten().fieldErrors,
      message:"Missing Fields. Field to Update Invoice."
    }
  }

  const {customerId,amount,status} = validatedFields.data
  // console.log("ValidatedFields",validatedFields.data)
  const amountInCents = amount * 100;
 
 try{
    await sql`
      UPDATE invoices
      SET customer_id = ${customerId}, amount = ${amountInCents}, status = ${status}
      WHERE id = ${id}
    `;
 }catch(error){
  console.log(error)
 }
 
  revalidatePath('/dashboard/invoices');
  redirect('/dashboard/invoices');
}


export async function deleteInvoice(id:string){
  // throw new Error("Failed to Delete Invoice")
  await sql`DELETE FROM invoices WHERE id = ${id}`;
  revalidatePath('/dashboard/invoices')
}



 
import { signIn } from '@/auth';
import { AuthError } from 'next-auth';
 
// ...
 
export async function authenticate(
  prevState: string | undefined,
  formData: FormData,
) {
  try {
    await signIn('credentials', formData);
  } catch (error) {
    if (error instanceof AuthError) {
      console.log("errorType",error.type)
      switch (error.type) {
        case 'CredentialsSignin':
          return 'Invalid credentials.';
        default:
          return 'Something went wrong.';
      }
    }
    throw error;
  }
}