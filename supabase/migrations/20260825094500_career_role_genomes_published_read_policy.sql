begin;

alter table public.career_role_genomes enable row level security;

drop policy if exists career_role_genomes_read_published on public.career_role_genomes;
create policy career_role_genomes_read_published
on public.career_role_genomes
for select
to anon, authenticated
using (
  status = 'published'
  and exists (
    select 1
    from public.career_roles r
    where r.id = career_role_genomes.role_id
      and r.status = 'published'
  )
);

commit;
