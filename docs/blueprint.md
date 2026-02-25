# **App Name**: H2vl Connect

## Core Features:

- User Authentication: Secure sign-up and login for association members using Firebase Authentication, supporting PWA and native mobile platforms.
- Member Profile Management: Allow members to view and update their personal details (nom, prenom, email, telephone, date_inscription) stored in Firestore.
- Event Discovery: Browse a comprehensive list of all upcoming events (titre, description, date, lieu, prix) stored in Firestore.
- Event Registration & Payment Tracking: Members can register for events, with their inscription (id_evenement, id_adherent, a_paye, date_inscription) recorded in Firestore. This action triggers an email confirmation via a Firebase Extension.
- AI Event Description Tool: Provide a tool for administrators or event organizers to generate compelling event descriptions using generative AI, based on a few input keywords or title.
- Admin Membership & Registration Dashboard: A secure administrative interface for viewing, adding, editing, and managing member records and event registrations, including tracking payment status.

## Style Guidelines:

- Primary Color: A dependable, community-oriented deep blue (#2E73B8) chosen for its balance of professionalism and approachability. This hue will create strong contrast against lighter backgrounds.
- Background Color: A very light, subtly desaturated grey-blue (#F0F2F5) providing a clean and calm canvas, minimizing eye strain while maintaining a connection to the primary color.
- Accent Color: A vibrant, clear cyan (#33DADA) analogous to the primary but brighter and more saturated, ideal for calls to action, highlights, and interactive elements to ensure visual pop and accessibility.
- All text (headlines and body) should use 'Inter', a grotesque-style sans-serif font. Its modern, objective, and neutral aesthetic ensures high readability and aligns well with the technical rigor and accessibility requirements of the application.
- Employ clean, highly legible line-based or solid icons that are universally understandable and provide sufficient contrast. Iconography should aid navigation and content comprehension while adhering to WCAG 2.1 AA standards for sizing and clarity.
- Implement a responsive and adaptive layout that functions seamlessly across both PWA (web) and native mobile platforms. Prioritize clear visual hierarchy, generous white space for readability, and adherence to WCAG standards for logical focus order and element spacing.
- Utilize subtle and purposeful animations for transitions and feedback. Animations should enhance the user experience without being distracting, such as gentle fades for content loading or slight transformations on interactive elements to confirm user actions.