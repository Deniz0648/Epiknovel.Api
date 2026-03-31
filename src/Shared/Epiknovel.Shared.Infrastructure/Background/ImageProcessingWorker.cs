using System.Runtime.CompilerServices;
using System.Threading.Channels;
using Epiknovel.Shared.Core.Interfaces;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using SixLabors.ImageSharp;
using SixLabors.ImageSharp.Processing;
using SixLabors.ImageSharp.Formats.Webp;

namespace Epiknovel.Shared.Infrastructure.Background;

public record ImageProcessingTask(string OriginalPath, string TargetPath, int Width, int Height, ResizeMode Mode);

public interface IImageProcessingQueue
{
    ValueTask EnqueueAsync(ImageProcessingTask task);
}

public class ImageProcessingQueue : IImageProcessingQueue
{
    private readonly Channel<ImageProcessingTask> _channel = Channel.CreateUnbounded<ImageProcessingTask>();

    public ValueTask EnqueueAsync(ImageProcessingTask task) => _channel.Writer.WriteAsync(task);

    public async IAsyncEnumerable<ImageProcessingTask> DequeueAllAsync([EnumeratorCancellation] CancellationToken ct)
    {
        while (await _channel.Reader.WaitToReadAsync(ct))
        {
            while (_channel.Reader.TryRead(out var task))
            {
                yield return task;
            }
        }
    }
}

public class ImageProcessingWorker(
    IImageProcessingQueue queue,
    ILogger<ImageProcessingWorker> logger) : BackgroundService
{
    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        logger.LogInformation("Image Processing Worker (WebP) başlatıldı.");

        await foreach (var task in ((ImageProcessingQueue)queue).DequeueAllAsync(stoppingToken))
        {
            try
            {
                using var image = await Image.LoadAsync(task.OriginalPath, stoppingToken);

                if (task.Width > 0 || task.Height > 0)
                {
                    image.Mutate(x => x.Resize(new ResizeOptions
                    {
                        Size = new Size(task.Width, task.Height),
                        Mode = task.Mode
                    }));
                }

                var encoder = new WebpEncoder { Quality = 80 };
                await image.SaveAsync(task.TargetPath, encoder, stoppingToken);
                
                // Orijinal geçici dosyayı temizle
                if (File.Exists(task.OriginalPath)) File.Delete(task.OriginalPath);
                
                logger.LogDebug("Görsel başarıyla WebP'ye dönüştürüldü: {Path}", task.TargetPath);
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Görsel işlenirken hata: {Path}", task.OriginalPath);
            }
        }
    }
}
