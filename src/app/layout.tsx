import './globals.css'
import { supabase } from '../lib/supabase'


export const metadata = {
title: 'Workers App',
description: 'Workers / Contractors app'
}


export default function RootLayout({ children }: { children: React.ReactNode }) {
return (
<html lang="en">
<body>
<main style={{ maxWidth: 900, margin: '0 auto', padding: 20 }}>{children}</main>
</body>
</html>
)
}