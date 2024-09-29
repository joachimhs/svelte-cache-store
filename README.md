# CacheStore for Svelte

This library provides a cache store for Svelte applications that simplifies fetching, creating, updating, and deleting items from a REST API that adheres to the simple-json-api specification. It also supports side-loading of related data and automatic cache management.

## Features

- **Centralized Cache Management**: Manage different types of data with separate caches.
- **Lazy Fetching**: Data is only fetched from the server when needed, and cached for future use.
- **Side-Loading Support**: Automatically handles side-loaded data returned by the API and caches it accordingly.
- **Sorting**: Supports sorting of fetched data based on specified columns.
- **Comprehensive CRUD Operations**: Simplified methods to create, read, update, and delete items.

## Side-Loading Support

The cache store automatically handles side-loaded data. When an API response includes side-loaded data (e.g., related images returned along with blog posts), the store will add this data to the appropriate cache if the type is registered

## Rationale

I find myself implementing similar backend APIs when I develop applications. These APis are more often than not based on REST principles with JSON payloads. As a result, I have publised the start of a simple JSON API spec at [http://simple-json-api.com](http://simple-json-api.com). This specification makes it easy to write both backend and frontend code to handle the data communication between the applications in a uniform manner. This approach makes it possible to write a fairly small amount of code to get advanced functionality on the frontend-data-layer.

# Installation

```
npm install svelte-cache-store
```


# Usage

## Registering the data entities to cache

Each of the data-types that the CacheStore can handle needs to be registered, so that the CacheStore knows how to query the backend API. This means that it needs to provide the CacheStore with:

- the singular form of the entity to cache
- the plural form of the entity to cache
- the URL prefix that your backend uses

If you are writing a Blog, then you might have two data types - BlogPost and BlogPostImages. 
Both of these needs to be a Typescript type and registered with the store - typically in 
src/+layout.svelte:

### BlogPost.ts

```typescript
export interface BlogPost extends CacheItem {
    title: string;
    preamble: string;
    content: string;
    createdDate: string;
    username: string;
    isVisible: boolean;
    images: string[];
}
```

### BlogPostImage.ts

```typescript
export interface BlogPostImage extends CacheItem{
    imagePath: string;
    blogPostId: string;
}
```

### +layout.svelte
```sveltehtml
<script lang="ts">
import {cacheStore} from "svelte-cache-store";
import type {BlogPost} from "./BlogPost";
import type {BlogPostImage} from "./BlogPostImage";

cacheStore.registerType<BlogPost>('blogPost', 'blogPosts', '/my-api');
cacheStore.registerType<BlogPostImage>('blogPostImage', 'blogPostImages', '/my-api');
</script>

<slot></slot>
```

The code above registeres the types blogPost and blogPostImage with CacheStore. If you server live on http://myurl, then the URL to fetch all blogPosts would be: http://myurl/my-api/blogPosts

## Fetching data

Data can be fetched in two ways:

- **fetchAll<Type>(singularName)**
- **fetchById<Type>(singularName, id)**

### fetchById<Type extends CacheItem>(singularName, id)

This method fetches an item by its ID. If the item is already in the cache, it will be returned immediately; otherwise, it will be fetched from the API. Sideloaded data will be automatically added to the cache.

```
let blogPost : BlogPost = await cacheStore.fetchById<BlogPost>('blogPost', '123');
```

The data will be fetched via a GET to **/my-api/blogPosts/123**.

The return JSON will be something like this:

```json
{
  "blogPost": {
    "id": "123",
    "title": "My Blog Post",
    "preamble": "This is a blog post",
    "content": "This is the content of the blog post",
    "createdDate": "2021-10-10",
    "username": "user",
    "isVisible": true,
    "images": ["456"]
  }
}
```

### fetchAll<Type extends CacheItem>(singularName)

This method fetches all items of a specific type. If the items are already in the cache, they will be returned immediately; otherwise, they will be fetched from the API. Sideloaded data will be automatically added to the cache.

**sortColumns**: An optional array of sorting criteria.

```
let blogPosts : BlogPost[] = await cacheStore.fetchAll<BlogPost>('blogPost', [{ sortColumn: 
'createdDate', sortOrder: 'desc' }]);
```

The data will be fetched via a GET to **/my-api/blogPosts**.

The return JSON will be something like this:

```json
{
  "blogPosts": [
    {
      "id": "123",
      "title": "My Blog Post",
      "preamble": "This is a blog post",
      "content": "This is the content of the blog post",
      "createdDate": "2021-10-10",
      "username": "user",
      "isVisible": true,
      "images": ["456"]
    },
    {
      "id": "124",
      "title": "My Second Blog Post",
      "preamble": "This is a blog post",
      "content": "This is the content of the blog post",
      "createdDate": "2021-10-10",
      "username": "user",
      "isVisible": true,
      "images": ["457"]
    }
  ]
}
```

### reloadById<Type extends CacheItem>(singularName, id)

This method forces a re-fetch of the item from the API, even if it is already in the cache. The updated data will be placed in the cache

```
let refreshedBlogPost = await cacheStore.reloadById('blogPost', '123');
```

### reloadAll<Type extends CacheItem>(singularName)

This method forces a re-fetch of all items from the API, even if they are already in the cache. The updated data will be placed in the cache

```
let refreshedBlogPosts = await cacheStore.reloadAll('blogPost', [{ sortColumn: 'createdDate', sortOrder: 'desc' }]);
```

### create<Type extends CacheItem>(singularName, object)

This method creates a new item via the API and adds it to the cache.

```
let blogPost : BlogPost = await cacheStore.create('blogPost', myBlogPost);
```

The data will be stored via a POST to **/my-api/blogPosts**.

### update<Type extends CacheItem>(singualrName, id, object)

This method updates an item by its ID via the API and updates the cache with the new data.

```
blogPost = await cacheStore.update('blogPost', '123', myBlogPost);
```

The data will be fetched via a PUT to **/my-api/blogPost/123s**.

### remove(singularName, id)

This method deletes an item by its ID via the API and removes it from the cache.

```
await cacheStore.remove('blogPost', '123');
```

The data will be deleted via a DELETE to **/my-api/blogPosts/123**.

# Example

Each data type that CacheStore should handle, needs to be registered. This is typically done application-wide in src/+layout.svelte:

```javascript
<script>
import {cacheStore} from "svelte-cache-store";
import type {BlogPost} from "./BlogPost";
import type {BlogPostImage} from "./BlogPostImage";
    
cacheStore.registerType<BlogPost>('blogPost', 'blogPosts', '/my-api');
cacheStore.registerType<BlogPostImage>('blogPostImage', 'blogPostImages', '/my-api');
</script>

<slot></slot>
```

To fetch, create, update and delete data, this is normally done in the page-components. For the blog application, all blog posts might fetched in the /src/routes/+page.svelte component.

```
<script>
    import {cacheStore} from "svelte-cache-store";
    import {onMount} from "svelte";

    let blogPosts : BlogPost[] = [];
    onMount(async () => {
        // Fetch all blog posts, sorted by 'createdDate' in descending order
        const result = await cacheStore.fetchAll<BlogPost>('blogPost', [{ sort: 'createdDate', 
        order: 'desc' }]);

        // Filter the blog posts to include only those where data.isVisible is true
        blogPosts = result.filter(post => post.data && post.data.isVisible);
    });
</script>

<div class="header">
    <!-- Your logo goes here -->
</div>

<h1>Blog Posts</h1>

{#if blogPosts.length === 0}
    <p>No blog posts found.</p>
{:else}
    <ul>
        {#each blogPosts as blogPost}
            <li>
                <a href={`/blogPost/${blogPost.id}`}>{blogPost.title}</a>
            </li>
        {/each}
    </ul>
{/if}
```

From the cache, the items state (loading, updating, deleting, loaded, error) is kept in 
the state-property. If any error message is received while fetching data from the backend, 
it can be found in the *errorMessage*-property.

When the user navigates to a single blogPost, the blog should be presented, along with any images 
that belong to the blogPost, in /src/routes/blogPost/[blogId]/+page.svelte:

```sveltehtml
<script lang="ts">
    import {cacheStore} from "svelte-cache-store";
    import {onMount} from "svelte";
    import {page} from "$app/stores";
    import Markdown from "$lib/components/Markdown.svelte";
    import type {BlogPost} from "$lib/models/BlogPost";
    import type {BlogPostImage} from "$lib/models/BlogPostImage";
    
    let blogPost : BlogPost;
    let blogImages : BlogPost[] = [];
    onMount(async () => {
        blogPost = await cacheStore.fetchById<BlogPost>('blogPost', $page.params.id);
        if (blogPost.state === 'loaded' && blogPost.images) {
            for (const image of blogPost.images) {
                let img : BlogPostImage = await cacheStore.fetchById<BlogPostImage>
    ('blogPostImage', image);
                console.log(img);
                blogImages = [...blogImages, img];
            }
        }
    });

</script>

<div><a href="/">Back</a></div>

{#if blogPost?.state === 'error'}
    <p style="color: red;">Error: {blogPost.errorMessage || 'Unknown error'}</p>
{:else if blogPost?.state === 'loaded'}
    <h1>{blogPost.title}</h1>

    {#each blogImages as image}
        <img src={image.imagePath} />
    {/each}
    <p>Created by {blogPost.username} on {blogPost.createdDate}</p>

    <p>{blogPost.preamble}</p>

    <p><Markdown toHtml={blogPost.content} /></p>
{:else if blogPost?.state === 'loading'}
    <p>Loading...</p>
{/if}
```

As you can see from the above code, we can implement loading indicators, as well as error messages fairly easily with this setup. Fetching data is also streamlined accross each data type. 
