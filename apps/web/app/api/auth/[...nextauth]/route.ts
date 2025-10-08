import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';

const handler = NextAuth({
  providers: [
    Credentials({
      name: 'Magic Email (dev)',
      credentials: { email: { label: 'Email', type: 'text' } },
      async authorize(credentials) {
        const email = credentials?.email as string;
        if (!email) return null;
        // Dev-only: accept any email, assign role viewer by default
        return { id: email, email, name: email.split('@')[0], role: 'viewer' } as any;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) token.role = (user as any).role || 'viewer';
      return token;
    },
    async session({ session, token }) {
      (session as any).role = (token as any).role;
      return session;
    },
  },
});

export { handler as GET, handler as POST };

