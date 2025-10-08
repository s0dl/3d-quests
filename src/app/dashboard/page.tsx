"use client"
import { authClient } from "@/lib/auth-client"
import { redirect } from "next/navigation"

export default function DashboardHome() {
    async function signout() {
        await authClient.signOut();
        redirect("/");
    }

    return (
        <div>
            <button onClick={signout}><h1>Hello</h1></button>
        </div>
    );
}