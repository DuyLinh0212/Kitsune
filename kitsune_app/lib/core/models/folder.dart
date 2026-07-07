// kitsune_app/lib/core/models/folder.dart

class FolderDto {
  final int id;
  final int userId;
  final String name;
  final String? description;
  final bool isPublic;
  final String createdAt;
  final int vocabCount;

  const FolderDto({
    required this.id,
    required this.userId,
    required this.name,
    this.description,
    this.isPublic = false,
    required this.createdAt,
    this.vocabCount = 0,
  });

  factory FolderDto.fromJson(Map<String, dynamic> json) {
    final vocabArr = json['Vocabularies'] as List<dynamic>?;
    final vocabCount = (vocabArr != null && vocabArr.isNotEmpty)
        ? ((vocabArr[0] as Map<String, dynamic>)['count'] ?? 0) as int
        : 0;

    return FolderDto(
      id: json['Id'] as int,
      userId: json['UserId'] as int,
      name: json['FolderName'] as String,
      description: json['Description'] as String?,
      isPublic: (json['IsPublic'] ?? false) as bool,
      createdAt: json['CreatedAt'] as String,
      vocabCount: vocabCount,
    );
  }
}

class CreateFolderDto {
  final String name;
  final String? description;
  final bool isPublic;

  const CreateFolderDto({
    required this.name,
    this.description,
    this.isPublic = false,
  });

  Map<String, dynamic> toJson() => {
        'FolderName': name,
        'Description': description,
        'IsPublic': isPublic,
      };
}

class UpdateFolderDto {
  final String? name;
  final String? description;
  final bool? isPublic;

  const UpdateFolderDto({this.name, this.description, this.isPublic});
}
