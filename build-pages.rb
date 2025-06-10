# build_pages.rb (v7.1 - with new separator)

require 'fileutils'

collections_to_process = ['_places', '_posts']
YAML_FRONT_MATTER_REGEXP = /\A(---\s*\n.*?\n?)^((---|\.\.\.)\s*$\n?)/m

def parse_file(file_content)
  if file_content.start_with?("---")
    parts = file_content.split("---", 3)
    return [parts[1], parts[2] || '']
  else
    return [nil, file_content]
  end
end

puts "Starting bilingual page build..."

collections_to_process.each do |collection_folder|
  source_dir = File.join(collection_folder, '_content')
  dest_dir = collection_folder

  unless Dir.exist?(source_dir)
    puts "SKIPPED: Source directory '#{source_dir}' not found."
    next
  end

  puts "Processing collection: '#{collection_folder}'"
  Dir.glob(File.join(dest_dir, '*.md')).each { |file| File.delete(file) }

  Dir.glob(File.join(source_dir, '*.md')).each do |en_file_path|
    next if en_file_path.end_with?('-he.md')

    base_name = File.basename(en_file_path, '.md')
    he_file_path = File.join(source_dir, "#{base_name}-he.md")

    puts "Processing: #{base_name}"

    en_full_content = File.read(en_file_path)
    main_front_matter_yaml, main_en_content = parse_file(en_full_content)

    main_he_content = ''
    if File.exist?(he_file_path)
      he_full_content = File.read(he_file_path)
      _he_front_matter, main_he_content = parse_file(he_full_content)
    end

    # This block now uses your chosen separator
    combined_content = <<~CONTENT
      ---
      #{main_front_matter_yaml.strip}
      ---
      #{main_en_content.strip}

      %%%HEBREW%%%

      #{main_he_content.strip}
    CONTENT

    dest_file_path = File.join(dest_dir, "#{base_name}.md")
    File.write(dest_file_path, combined_content)
    puts "  -> Generated #{dest_file_path}"
  end
end

puts "Bilingual page build complete."