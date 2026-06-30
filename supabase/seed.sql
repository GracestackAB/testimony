-- Seed: Café Liv + LP Stockholm + Norrtullskyrkan + Citykyrkan
-- Körs efter migrations. Alla publicerade så de syns i katalogen.

insert into public.organizations (slug, name, type, city, description, about, is_published) values
  ('cafe-liv', 'Café Liv', 'cafe', 'Stockholm',
   'Där det serveras mat, samtal och hopp – varje onsdag.',
   'Café Liv är en mötesplats för människor i alla situationer. Här serveras varm mat, kaffe och samtal. Kim och Sofia är volontärer varje onsdag.',
   true),
  ('lp-stockholm', 'LP-verksamheten Stockholm', 'social', 'Stockholm',
   'Pingst alkohol- och narkotikarehabilitering – en andra chans.',
   'LP-verksamheten möter människor i missbruk med värme, struktur och Jesus. Livsomvändelse är inte en metafor – det händer på riktigt.',
   true),
  ('norrtullskyrkan', 'Norrtullskyrkan', 'forsamling', 'Stockholm',
   'En församling mitt i staden.',
   'Norrtullskyrkan är en levande församling i centrala Stockholm.',
   true),
  ('citykyrkan', 'Citykyrkan', 'forsamling', 'Stockholm',
   'Kims egen församling.',
   'Citykyrkan är en gemenskap av människor som följer Jesus i vardagen.',
   true)
on conflict (slug) do nothing;

-- Första musikvittnesbördet som mall ("New Creation – Kim's Testimony")
insert into public.testimonies (
  slug, title, lede, body, format, media_embed_url,
  reading_minutes, is_anonymous, status, published_at
) values (
  'new-creation-kims-testimony',
  'New Creation – mitt vittnesbörd',
  'Det var inte viljestyrka som bar mig ut ur mörkret. Det var att jag mötte någon som såg mig innan jag såg mig själv.',
  E'Jag skrev New Creation på tågstationen i Karlstad med en linjal som microfonstativ.\n\nJag var inte på väg någonstans särskilt. Men någonting i mig höll på att födas. Jag visste inte då att det jag skulle säga i låten var det jag själv behövde höra.\n\n"I''m a new creation" – det är inte en proklamation. Det är ett rop. Ett rop från någon som försökt bli ny med egna krafter tillräckligt många gånger för att veta att det inte går.\n\nGud gjorde det jag inte kunde göra. Den här låten är bara kvittot.',
  'musik',
  'https://www.youtube.com/embed/dQw4w9WgXcQ',  -- placeholder, byt till riktig länk
  4,
  false,
  'published',
  now()
) on conflict (slug) do nothing;

-- Tagga musikvittnesbördet till Citykyrkan
insert into public.content_organizations (content_kind, content_id, organization_id)
select 'testimony', t.id, o.id
from public.testimonies t, public.organizations o
where t.slug = 'new-creation-kims-testimony' and o.slug = 'citykyrkan'
on conflict do nothing;

-- Seed-volontäruppgifter för Café Liv
insert into public.volunteer_opportunities (
  slug, organization_id, title, description, category, commitment, location, skills_required, status
)
select
  'cafe-liv-matservering',
  o.id,
  'Matservering onsdagar på Café Liv',
  'Hjälp till med att servera mat, diska och prata med våra gäster. Inga förkunskaper krävs – bara ett öppet sinne och ett varmt hjärta.',
  'praktiskt', 'veckovis', 'Café Liv, Stockholm', 'Tålamod och värme.', 'open'
from public.organizations o where o.slug = 'cafe-liv'
on conflict (slug) do nothing;

insert into public.volunteer_opportunities (
  slug, organization_id, title, description, category, commitment, location, skills_required, status
)
select
  'cafe-liv-forbon',
  o.id,
  'Förbedjare på Café Liv',
  'Be för de som kommer till Café Liv – på plats eller hemifrån. Vi delar böneämnen veckovis.',
  'forbon', 'veckovis', 'Café Liv eller digitalt', 'Vilja att lyssna och be.', 'open'
from public.organizations o where o.slug = 'cafe-liv'
on conflict (slug) do nothing;

insert into public.volunteer_opportunities (
  slug, organization_id, title, description, category, commitment, location, skills_required, status
)
select
  'lp-korfrare',
  o.id,
  'Körförare LP-läger',
  'Kör våra deltagare till och från läger. Krav: B-körkort och giltigt körkort i minst 3 år.',
  'praktiskt', 'engangs', 'Stockholm med omnejd', 'B-körkort.', 'open'
from public.organizations o where o.slug = 'lp-stockholm'
on conflict (slug) do nothing;
