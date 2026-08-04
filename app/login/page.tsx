import LoginForm from "@/components/login-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Image from "next/image";
import Link from "next/link";

export default function LoginPage() {
  return (
    <div className="flex justify-center items-center h-screen bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mb-3 flex justify-center">
            <Image
              src="/logo.png"
              alt="Musafir-Go logo"
              width={72}
              height={72}
              priority
              className="h-16 w-16 rounded-full object-cover shadow-sm ring-1 ring-black/10"
            />
          </div>
          <CardTitle className="text-2xl">Sign In</CardTitle>
          <p className="text-gray-500">Use email or choose a social provider</p>
        </CardHeader>
        <CardContent>
          <LoginForm />
          <div className="mt-4 text-center text-sm">
            <Link href="/" className="text-blue-600 hover:underline">
              Back to Homepage
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
