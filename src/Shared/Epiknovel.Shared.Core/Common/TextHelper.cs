namespace Epiknovel.Shared.Core.Common;

public static class TextHelper
{
    /// <summary>
    /// Verilen iki metin arasındaki Levenshtein mesafesini hesaplar.
    /// (Spam engelleme ve metin benzerliği için kullanılır.)
    /// </summary>
    public static int CalculateLevenshteinDistance(string source1, string source2)
    {
        if (source1 == null) return source2?.Length ?? 0;
        if (source2 == null) return source1.Length;

        int source1Length = source1.Length;
        int source2Length = source2.Length;

        var matrix = new int[source1Length + 1, source2Length + 1];

        for (int i = 0; i <= source1Length; matrix[i, 0] = i++) { }
        for (int j = 0; j <= source2Length; matrix[0, j] = j++) { }

        for (int i = 1; i <= source1Length; i++)
        {
            for (int j = 1; j <= source2Length; j++)
            {
                int cost = (source2[j - 1] == source1[i - 1]) ? 0 : 1;

                matrix[i, j] = Math.Min(
                    Math.Min(matrix[i - 1, j] + 1, matrix[i, j - 1] + 1),
                    matrix[i - 1, j - 1] + cost);
            }
        }

        return matrix[source1Length, source2Length];
    }

    /// <summary>
    /// İki metin arasındaki benzerlik oranını döner (0.0 - 1.0 arası).
    /// </summary>
    public static double CalculateSimilarity(string source1, string source2)
    {
        if (string.IsNullOrEmpty(source1) && string.IsNullOrEmpty(source2)) return 1.0;
        if (string.IsNullOrEmpty(source1) || string.IsNullOrEmpty(source2)) return 0.0;

        int distance = CalculateLevenshteinDistance(source1, source2);
        int maxLen = Math.Max(source1.Length, source2.Length);

        return 1.0 - ((double)distance / maxLen);
    }
}
