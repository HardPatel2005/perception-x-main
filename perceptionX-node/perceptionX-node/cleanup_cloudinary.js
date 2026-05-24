require('dotenv').config();
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true
});

async function deleteAllResources() {
    try {
        console.log('🗑️ Starting complete Cloudinary cleanup...\n');
        
        let totalDeleted = 0;
        const resourceTypes = ['image', 'video', 'raw'];
        
        for (const resourceType of resourceTypes) {
            console.log(`\n📁 Processing ${resourceType} resources...`);
            let nextCursor = null;
            let typeDeleted = 0;
            
            do {
                try {
                    const result = await cloudinary.api.resources({
                        type: 'upload',
                        resource_type: resourceType,
                        max_results: 500,
                        next_cursor: nextCursor
                    });
                    
                    if (result.resources && result.resources.length > 0) {
                        const publicIds = result.resources.map(r => r.public_id);
                        console.log(`   Found ${publicIds.length} ${resourceType} files, deleting...`);
                        
                        // Delete in batches of 100
                        for (let i = 0; i < publicIds.length; i += 100) {
                            const batch = publicIds.slice(i, i + 100);
                            try {
                                const deleteResult = await cloudinary.api.delete_resources(batch, {
                                    resource_type: resourceType
                                });
                                const deleted = Object.keys(deleteResult.deleted || {}).length;
                                typeDeleted += deleted;
                                totalDeleted += deleted;
                                console.log(`   ✅ Deleted batch: ${deleted} files`);
                            } catch (err) {
                                console.log(`   ⚠️ Error deleting batch: ${err.message}`);
                            }
                        }
                    }
                    
                    nextCursor = result.next_cursor;
                } catch (err) {
                    console.log(`   ⚠️ Error listing ${resourceType} resources: ${err.message}`);
                    break;
                }
            } while (nextCursor);
            
            console.log(`   ✅ Total ${resourceType} files deleted: ${typeDeleted}`);
        }
        
        // Try to get usage info
        try {
            const usage = await cloudinary.api.usage();
            if (usage.storage) {
                const usedMB = (usage.storage.used_bytes || 0) / (1024 * 1024);
                const quotaMB = (usage.storage.quota_bytes || 0) / (1024 * 1024);
                console.log(`\n📊 Updated Usage: ${usedMB.toFixed(2)} MB / ${quotaMB.toFixed(2)} MB`);
                console.log(`   Available: ${(quotaMB - usedMB).toFixed(2)} MB`);
            }
        } catch (err) {
            console.log(`\n⚠️ Could not fetch usage info: ${err.message}`);
        }
        
        console.log(`\n✅ Cleanup complete!`);
        console.log(`   Total files deleted: ${totalDeleted}`);
        
    } catch (error) {
        console.error('❌ Error during cleanup:', error.message);
        if (error.http_code) {
            console.error(`   HTTP Code: ${error.http_code}`);
        }
        console.error(error);
    }
}

deleteAllResources();
