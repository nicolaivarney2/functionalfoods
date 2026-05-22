import type {
  RemaDepartment,
  RemaListResponse,
  RemaProduct,
} from './types'

const BASE_URL = 'https://api.digital.rema1000.dk/api/v3'
const USER_AGENT = 'functionalfoods-grocery-sync/1.0 (+https://functionalfoods.dk)'
const PAGE_SIZE = 100

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'application/json',
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '<no body>')
    throw new Error(`REMA API ${res.status}: ${path} — ${body.slice(0, 300)}`)
  }
  return (await res.json()) as T
}

export async function getDepartments(): Promise<RemaDepartment[]> {
  const res = await fetchJson<{ data: RemaDepartment[] }>('/departments')
  return res.data
}

export async function getDepartmentProductsPage(
  departmentId: number,
  page: number,
  perPage = PAGE_SIZE,
): Promise<RemaListResponse<RemaProduct>> {
  return fetchJson<RemaListResponse<RemaProduct>>(
    `/departments/${departmentId}/products?per_page=${perPage}&page=${page}`,
  )
}

/**
 * Yields every REMA product, tagging each with its department for
 * downstream categorisation.
 */
export async function* iterateAllRemaProducts(): AsyncGenerator<
  { product: RemaProduct; department: RemaDepartment },
  void,
  unknown
> {
  const departments = await getDepartments()
  for (const dept of departments) {
    let page = 1
    let lastPage = Infinity
    while (page <= lastPage) {
      const res = await getDepartmentProductsPage(dept.id, page)
      for (const product of res.data) {
        yield { product, department: dept }
      }
      lastPage = res.meta.pagination.last_page
      page++
    }
  }
}
